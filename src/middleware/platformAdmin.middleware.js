import { verifyAccessToken } from "../utils/jwt.js";
import { PlatformAdmin } from "../models/platformAdmin.model.js";
import { sendError } from "../utils/apiResponse.js";

export const protectPlatformAdmin = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const headerToken = header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : "";
    const token = headerToken || req.cookies?.platformAdminAccessToken;
    if (!token)
      return sendError(
        res,
        "Platform administrator authentication is required.",
        null,
        401,
      );
    const decoded = verifyAccessToken(token);
    if (decoded.role !== "PLATFORM_ADMIN")
      return sendError(
        res,
        "Platform administrator access is required.",
        null,
        403,
      );
    const admin = await PlatformAdmin.findById(decoded.id);
    if (!admin || !admin.isActive)
      return sendError(
        res,
        "Platform administrator account is inactive or unavailable.",
        null,
        401,
      );
    req.platformAdmin = admin;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    )
      return sendError(
        res,
        "Platform administrator session expired or is invalid.",
        null,
        401,
      );
    next(error);
  }
};

export const requireAdminRoles =
  (...roles) =>
  (req, res, next) => {
    if (!req.platformAdmin)
      return sendError(
        res,
        "Platform administrator authentication is required.",
        null,
        401,
      );
    if (
      req.platformAdmin.role === "SUPER_ADMIN" ||
      roles.includes(req.platformAdmin.role)
    )
      return next();
    return sendError(
      res,
      "This platform role cannot perform this action.",
      null,
      403,
    );
  };
