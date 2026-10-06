export const isPublicDemo = (env = process.env) =>
  env.NODE_ENV === "production" && env.PUBLIC_DEMO === "true";

export const demoEmail = (username) => `${username.toLowerCase()}@demo.getclaim.invalid`;

export const seededDemoEmails = [
  "customer@getclaim.in",
  "neha@getclaim.in",
  "rohan@getclaim.in",
  "surveyor@getclaim.in",
  "vikram@getclaim.in",
  "admin@getclaim.in",
  "superadmin@getclaim.in",
];
