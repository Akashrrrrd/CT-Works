// Real-time Collaboration and Version Control System
import { EventEmitter } from 'events';

export interface CollaborationEvent {
  id: string;
  type: 'computation_created' | 'computation_updated' | 'template_modified' | 'user_joined' | 'user_left';
  workspaceId: string;
  userId: string;
  userName: string;
  timestamp: Date;
  data: any;
}

export interface UserPresence {
  userId: string;
  userName: string;
  email: string;
  role: string;
  lastSeen: Date;
  currentPage?: string;
  isActive: boolean;
}

export interface ComputationVersion {
  id: string;
  computationId: string;
  version: number;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  createdBy: string;
  createdAt: Date;
  comment?: string;
}

export class CollaborationService extends EventEmitter {
  private static instance: CollaborationService;
  private activeUsers = new Map<string, UserPresence>();
  private computationVersions = new Map<string, ComputationVersion[]>();
  private workspaceSubscriptions = new Map<string, Set<string>>();

  static getInstance(): CollaborationService {
    if (!CollaborationService.instance) {
      CollaborationService.instance = new CollaborationService();
    }
    return CollaborationService.instance;
  }

  // User presence management
  userJoined(workspaceId: string, user: UserPresence): void {
    this.activeUsers.set(user.userId, { ...user, isActive: true, lastSeen: new Date() });
    
    if (!this.workspaceSubscriptions.has(workspaceId)) {
      this.workspaceSubscriptions.set(workspaceId, new Set());
    }
    this.workspaceSubscriptions.get(workspaceId)!.add(user.userId);

    const event: CollaborationEvent = {
      id: this.generateEventId(),
      type: 'user_joined',
      workspaceId,
      userId: user.userId,
      userName: user.userName,
      timestamp: new Date(),
      data: { user }
    };

    this.broadcastToWorkspace(workspaceId, event);
  }

  userLeft(workspaceId: string, userId: string): void {
    const user = this.activeUsers.get(userId);
    if (user) {
      user.isActive = false;
      user.lastSeen = new Date();
    }

    this.workspaceSubscriptions.get(workspaceId)?.delete(userId);

    const event: CollaborationEvent = {
      id: this.generateEventId(),
      type: 'user_left',
      workspaceId,
      userId,
      userName: user?.userName || 'Unknown',
      timestamp: new Date(),
      data: { userId }
    };

    this.broadcastToWorkspace(workspaceId, event);
  }

  updateUserPresence(userId: string, currentPage?: string): void {
    const user = this.activeUsers.get(userId);
    if (user) {
      user.lastSeen = new Date();
      user.currentPage = currentPage;
      user.isActive = true;
    }
  }

  getActiveUsers(workspaceId: string): UserPresence[] {
    const userIds = this.workspaceSubscriptions.get(workspaceId) || new Set();
    return Array.from(userIds)
      .map(userId => this.activeUsers.get(userId))
      .filter((user): user is UserPresence => user !== undefined && user.isActive);
  }

  // Version control for computations
  createComputationVersion(
    computationId: string,
    changes: ComputationVersion['changes'],
    createdBy: string,
    comment?: string
  ): ComputationVersion {
    if (!this.computationVersions.has(computationId)) {
      this.computationVersions.set(computationId, []);
    }

    const versions = this.computationVersions.get(computationId)!;
    const version: ComputationVersion = {
      id: this.generateEventId(),
      computationId,
      version: versions.length + 1,
      changes,
      createdBy,
      createdAt: new Date(),
      comment
    };

    versions.push(version);
    return version;
  }

  getComputationVersions(computationId: string): ComputationVersion[] {
    return this.computationVersions.get(computationId) || [];
  }

  getComputationVersion(computationId: string, version: number): ComputationVersion | null {
    const versions = this.computationVersions.get(computationId) || [];
    return versions.find(v => v.version === version) || null;
  }

  // Real-time event broadcasting
  broadcastComputationUpdate(
    workspaceId: string,
    computationId: string,
    userId: string,
    userName: string,
    changes: any
  ): void {
    const event: CollaborationEvent = {
      id: this.generateEventId(),
      type: 'computation_updated',
      workspaceId,
      userId,
      userName,
      timestamp: new Date(),
      data: { computationId, changes }
    };

    this.broadcastToWorkspace(workspaceId, event);
  }

  broadcastTemplateModification(
    workspaceId: string,
    templateId: string,
    userId: string,
    userName: string,
    changes: any
  ): void {
    const event: CollaborationEvent = {
      id: this.generateEventId(),
      type: 'template_modified',
      workspaceId,
      userId,
      userName,
      timestamp: new Date(),
      data: { templateId, changes }
    };

    this.broadcastToWorkspace(workspaceId, event);
  }

  private broadcastToWorkspace(workspaceId: string, event: CollaborationEvent): void {
    const subscribers = this.workspaceSubscriptions.get(workspaceId);
    if (subscribers) {
      subscribers.forEach(userId => {
        this.emit(`workspace:${workspaceId}:user:${userId}`, event);
      });
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Conflict resolution for concurrent edits
  resolveComputationConflict(
    computationId: string,
    localChanges: any,
    remoteChanges: any,
    strategy: 'merge' | 'overwrite' | 'manual' = 'merge'
  ): { resolved: any; conflicts: string[] } {
    const conflicts: string[] = [];
    let resolved = { ...localChanges };

    switch (strategy) {
      case 'merge':
        // Attempt automatic merge
        Object.keys(remoteChanges).forEach(key => {
          if (key in localChanges && localChanges[key] !== remoteChanges[key]) {
            conflicts.push(`Conflict in field: ${key}`);
            // Keep local changes by default, but flag conflict
          } else {
            resolved[key] = remoteChanges[key];
          }
        });
        break;

      case 'overwrite':
        resolved = { ...remoteChanges };
        break;

      case 'manual':
        // Return both versions for manual resolution
        conflicts.push('Manual resolution required');
        break;
    }

    return { resolved, conflicts };
  }

  // Activity feed for workspace
  getWorkspaceActivity(workspaceId: string, limit: number = 50): CollaborationEvent[] {
    // In a real implementation, this would query a database
    // For now, return empty array as placeholder
    return [];
  }

  // Cleanup inactive users
  cleanupInactiveUsers(inactiveThresholdMs: number = 300000): void { // 5 minutes
    const now = new Date();
    
    this.activeUsers.forEach((user, userId) => {
      if (now.getTime() - user.lastSeen.getTime() > inactiveThresholdMs) {
        user.isActive = false;
        
        // Remove from all workspace subscriptions
        this.workspaceSubscriptions.forEach((subscribers, workspaceId) => {
          if (subscribers.has(userId)) {
            subscribers.delete(userId);
            this.userLeft(workspaceId, userId);
          }
        });
      }
    });
  }
}

// WebSocket integration for real-time updates
export class WebSocketManager {
  private connections = new Map<string, WebSocket>();
  private collaboration = CollaborationService.getInstance();

  addConnection(userId: string, ws: WebSocket): void {
    this.connections.set(userId, ws);
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(userId, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      this.connections.delete(userId);
    });
  }

  private handleMessage(userId: string, message: any): void {
    switch (message.type) {
      case 'join_workspace':
        // Handle workspace join
        break;
      case 'leave_workspace':
        // Handle workspace leave
        break;
      case 'update_presence':
        this.collaboration.updateUserPresence(userId, message.currentPage);
        break;
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  broadcast(userIds: string[], event: CollaborationEvent): void {
    userIds.forEach(userId => {
      const ws = this.connections.get(userId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event));
      }
    });
  }
}

// Comment system for computations
export interface ComputationComment {
  id: string;
  computationId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  parentId?: string; // For threaded comments
  resolved?: boolean;
}

export class CommentService {
  private comments = new Map<string, ComputationComment[]>();

  addComment(
    computationId: string,
    userId: string,
    userName: string,
    content: string,
    parentId?: string
  ): ComputationComment {
    if (!this.comments.has(computationId)) {
      this.comments.set(computationId, []);
    }

    const comment: ComputationComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      computationId,
      userId,
      userName,
      content,
      createdAt: new Date(),
      parentId,
      resolved: false
    };

    this.comments.get(computationId)!.push(comment);
    return comment;
  }

  getComments(computationId: string): ComputationComment[] {
    return this.comments.get(computationId) || [];
  }

  resolveComment(commentId: string): boolean {
    for (const comments of this.comments.values()) {
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        comment.resolved = true;
        comment.updatedAt = new Date();
        return true;
      }
    }
    return false;
  }
}