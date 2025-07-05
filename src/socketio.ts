import { Server, Socket } from "socket.io";
import http from "http";
import Message from "./models/message.model"; 
import DirectMessage from "./models/directMessage.model";
import User from "./models/user.model";
import { NotificationService } from "./services/notification.service";
import { NotificationType } from "./models/notification.model";
import { MessageService } from "./services/message.service";
import { RoomService } from "./services/room.service";
import { ChatNotificationService } from "./services/chat-notification.service";

let io: Server;

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", async (socket: Socket) => {
    // Expect the client to pass userId as a query parameter on connect
    const { userId } = socket.handshake.query as { userId?: string };
    if (!userId) {
      console.warn("Socket connection without userId, disconnecting.");
      return socket.disconnect();
    }

    console.log(`User connected: ${userId}`);
    
    // Join the user-specific room so we can target messages
    socket.join(userId);
    
    // Get the Hub room and join it
    try {
      const hubRoom = await RoomService.getHubRoom();
      socket.join(hubRoom.id);
      
      // Add the user to the hub room if they're not already in it
      await RoomService.addUserToRoom(userId, hubRoom.id);
    } catch (error) {
      console.error("Error joining hub room:", error);
    }

    // Handle joining private DM rooms
    socket.on("join_dm", (targetUserId: string) => {
      const roomId = [userId, targetUserId].sort().join('-');
      socket.join(roomId);
      console.log(`User ${userId} joined DM room with ${targetUserId}`);
    });

    // Handle sending messages to the hub
    socket.on("send_hub_msg", async (content: string) => {
      try {
        const hubRoom = await RoomService.getHubRoom();
        const message = await MessageService.createHubMessage(userId, content);
        
        // Load the message with sender details
        const populatedMessage = await Message.findByPk(message.id, {
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'role']
            }
          ]
        });
        
        // Broadcast to all users in the hub
        io.to(hubRoom.id).emit("receive_hub_msg", populatedMessage);
      } catch (error) {
        console.error("Error sending hub message:", error);
      }
    });

    // Handle sending direct messages
    socket.on("send_dm", async (payload: { receiverId: string; content: string }) => {
      try {
        const { receiverId, content } = payload;
        
        // Create the message
        const message = await MessageService.createDirectMessage(userId, receiverId, content);
        
        // Load the message with sender and receiver details
        const populatedMessage = await DirectMessage.findByPk(message.id, {
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'role']
            },
            {
              model: User,
              as: 'receiver',
              attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'role']
            }
          ]
        });
        
        // Create notification for receiver
        const notification = await ChatNotificationService.createDirectMessageNotification(
          receiverId,
          userId,
          message.id,
          content
        );
        
        // Get the DM room ID (combination of both user IDs, sorted)
        const roomId = [userId, receiverId].sort().join('-');
        
        // Send to the DM room
        io.to(roomId).emit("receive_dm", populatedMessage);
        
        // Send notification to receiver
        io.to(receiverId).emit("new_notification", notification);
      } catch (error) {
        console.error("Error sending direct message:", error);
      }
    });

    // Handle updating hub messages
    socket.on("update_hub_msg", async (payload: { messageId: string; content: string }) => {
      try {
        const { messageId, content } = payload;
        const message = await Message.findByPk(messageId);
        
        if (!message || message.senderId !== userId) {
          return; // Not found or not authorized
        }
        
        await message.update({ 
          content, 
          updatedAt: new Date() 
        });
        
        const hubRoom = await RoomService.getHubRoom();
        io.to(hubRoom.id).emit("hub_msg_updated", {
          messageId,
          content,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error("Error updating hub message:", error);
      }
    });

    // Handle updating direct messages
    socket.on("update_dm", async (payload: { messageId: string; receiverId: string; content: string }) => {
      try {
        const { messageId, receiverId, content } = payload;
        const message = await DirectMessage.findByPk(messageId);
        
        if (!message || message.senderId !== userId) {
          return; // Not found or not authorized
        }
        
        await message.update({ 
          content, 
          updatedAt: new Date() 
        });
        
        // Get the DM room ID
        const roomId = [userId, receiverId].sort().join('-');
        
        // Create notification for receiver
        const notification = await ChatNotificationService.createMessageEditedNotification(
          receiverId,
          userId,
          messageId,
          true
        );
        
        // Send updates
        io.to(roomId).emit("dm_updated", {
          messageId,
          content,
          updatedAt: new Date()
        });
        
        io.to(receiverId).emit("new_notification", notification);
      } catch (error) {
        console.error("Error updating direct message:", error);
      }
    });

    // Handle deleting hub messages
    socket.on("delete_hub_msg", async (messageId: string) => {
      try {
        const message = await Message.findByPk(messageId);
        
        if (!message || message.senderId !== userId) {
          return; // Not found or not authorized
        }
        
        await message.update({ isDeleted: true });
        
        const hubRoom = await RoomService.getHubRoom();
        io.to(hubRoom.id).emit("delete_hub_msg", { messageId });
      } catch (error) {
        console.error("Error deleting hub message:", error);
      }
    });

    // Handle deleting direct messages
    socket.on("delete_dm", async (payload: { messageId: string; receiverId: string }) => {
      try {
        const { messageId, receiverId } = payload;
        const message = await DirectMessage.findByPk(messageId);
        
        if (!message || message.senderId !== userId) {
          return; // Not found or not authorized
        }
        
        await message.update({ isDeleted: true });
        
        // Get the DM room ID
        const roomId = [userId, receiverId].sort().join('-');
        
        // Create notification for receiver
        const notification = await ChatNotificationService.createMessageDeletedNotification(
          receiverId,
          userId,
          true
        );
        
        // Send updates
        io.to(roomId).emit("delete_dm", { messageId });
        io.to(receiverId).emit("new_notification", notification);
      } catch (error) {
        console.error("Error deleting direct message:", error);
      }
    });

    // Notifications handler
    socket.on("mark_read", async (notificationId: string) => {
      await NotificationService.markAsRead(notificationId);
      const { notifications } = await NotificationService.getUserNotifications(userId);
      socket.emit("notifications_update", notifications);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`);
      socket.leave(userId);
    });
  });

  return io;
};

// Helper function to send notifications
export const sendNotification = (userId: string, type: NotificationType, message: string, relatedEntityId?: string) => {
  NotificationService.createNotification(userId, type, message, relatedEntityId)
    .then(notification => {
      io.to(userId).emit("new_notification", notification);
    });
};

// Utility function to extract the socket instance
export const getSocket = () => io;