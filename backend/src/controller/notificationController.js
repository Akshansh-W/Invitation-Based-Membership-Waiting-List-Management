import Notification from "../models/Notification.js";

export async function listNotifications(req, res) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user_id: req.user.userId })
        .sort({ created_at: -1 })
        .limit(20)
        .select("type title body read_at created_at")
        .lean(),
      Notification.countDocuments({
        user_id: req.user.userId,
        read_at: null,
      }),
    ]);

    return res.status(200).json({
      notifications: notifications.map((notification) => ({
        id: notification._id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        read_at: notification.read_at,
        created_at: notification.created_at,
      })),
      unread_count: unreadCount,
    });
  } catch (error) {
    console.error("Notification list error:", error);
    return res.status(500).json({
      message: "Unable to fetch notifications.",
    });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, user_id: req.user.userId },
      { $set: { read_at: new Date() } },
      { new: true }
    ).select("_id read_at");

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    return res.status(200).json({
      notification: {
        id: notification._id,
        read_at: notification.read_at,
      },
    });
  } catch (error) {
    console.error("Notification update error:", error);
    return res.status(500).json({
      message: "Unable to update the notification.",
    });
  }
}
