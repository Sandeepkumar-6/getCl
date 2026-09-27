import { Notification } from "../models/index.js";
import { assert } from "../utils/errors.js";
import { paginate } from "../utils/pagination.js";
const scope = (user) => ({ $or: [{ recipient: user._id }, { recipientRole: user.role }] });
const present = (user) => (item) => ({ ...item.toObject(), read: item.recipient ? item.read : (item.readBy || []).some(id => String(id) === String(user._id)) });

export async function list(req, res) {
  res.json(
    await paginate(Notification.find(scope(req.user))
      .sort({ createdAt: -1, _id: -1 }), req.query, present(req.user)),
  );
}

export async function readAll(req, res) {
  await Notification.updateMany({ recipient: req.user._id }, { read: true });
  await Notification.updateMany({ recipientRole: req.user.role }, { $addToSet: { readBy: req.user._id } });
  res.json({ message: "All notifications marked as read." });
}

export async function readOne(req, res) {
  const notification = await Notification.findOne({ _id: req.params.id, ...scope(req.user) });
  assert(notification, 404, "Notification not found.");
  if (notification.recipient) notification.read = true;
  else notification.readBy.addToSet(req.user._id);
  await notification.save();
  res.json(present(req.user)(notification));
}
