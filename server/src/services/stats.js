import { AuditLog, Claim, Decision, User, statuses } from "../models/index.js";
import { scope } from "./claims.js";

export async function stats(req, res) {
  const filter = scope(req.user);
  const [summary, activity] = await Promise.all([
    Claim.aggregate([
      { $match: filter },
      { $facet: {
        counts: [{ $group: { _id: "$status", value: { $sum: 1 } } }],
        monthly: [{ $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, value: { $sum: 1 } } }, { $sort: { _id: 1 } }],
        payable: [
          { $lookup: { from: Decision.collection.name, localField: "_id", foreignField: "claim", pipeline: [{ $sort: { decidedAt: -1, _id: -1 } }, { $limit: 1 }], as: "decision" } },
          { $unwind: "$decision" },
          { $match: { "decision.outcome": "APPROVED" } },
          { $group: { _id: null, value: { $sum: "$decision.payableAmount" } } },
        ],
      } },
    ]),
    AuditLog.aggregate([
      { $match: { claim: { $ne: null } } },
      { $sort: { timestamp: -1, _id: -1 } },
      { $lookup: { from: Claim.collection.name, localField: "claim", foreignField: "_id", pipeline: [{ $match: filter }, { $project: { _id: 1 } }], as: "visibleClaim" } },
      { $match: { "visibleClaim.0": { $exists: true } } },
      { $limit: 6 },
      { $lookup: { from: User.collection.name, localField: "actor", foreignField: "_id", pipeline: [{ $project: { name: 1 } }], as: "actor" } },
      { $set: { actor: { $arrayElemAt: ["$actor", 0] } } },
      { $unset: "visibleClaim" },
    ]),
  ]);
  const result = summary[0];
  const counts = Object.fromEntries(statuses.map(status => [status, 0]));
  result.counts.forEach(row => { counts[row._id] = row.value; });
  res.json({
    total: result.counts.reduce((total, row) => total + row.value, 0), counts,
    approvedAmount: result.payable[0]?.value || 0,
    statusChart: result.counts.map(row => ({ name: row._id.replaceAll("_", " "), value: row.value })),
    monthly: result.monthly.map(row => ({ name: row._id, value: row.value })), activity,
  });
}
