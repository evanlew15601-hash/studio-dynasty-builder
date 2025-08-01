import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Clock, 
  Eye,
  X
} from 'lucide-react';
import { MediaEngine, MediaItem } from './MediaEngine';
import { CrisisManagement, Crisis } from './CrisisManagement';
import { MediaRelationships } from './MediaRelationships';
import { GameState } from '../../types/game';

interface MediaNotification {
  id: string;
  type: 'media' | 'crisis' | 'relationship' | 'trend';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: { week: number; year: number };
  read: boolean;
  actionable: boolean;
  relatedId?: string;
}

interface Props {
  gameState: GameState;
  onNotificationAction?: (notification: MediaNotification) => void;
}

export const MediaNotifications: React.FC<Props> = ({ gameState, onNotificationAction }) => {
  const [notifications, setNotifications] = useState<MediaNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    generateNotifications();
  }, [gameState.currentWeek, gameState.currentYear]);

  const generateNotifications = () => {
    const newNotifications: MediaNotification[] = [];

    // Recent media notifications
    const recentMedia = MediaEngine.getRecentMedia(5);
    recentMedia.forEach(media => {
      if (shouldNotifyAboutMedia(media)) {
        newNotifications.push(createMediaNotification(media));
      }
    });

    // Crisis notifications
    const activeCrises = CrisisManagement.getActiveCrises();
    activeCrises.forEach(crisis => {
      newNotifications.push(createCrisisNotification(crisis));
    });

    // Relationship notifications
    const relationshipSummary = MediaRelationships.getRelationshipSummary(gameState.studio.id);
    if (relationshipSummary.enemies > relationshipSummary.allies) {
      newNotifications.push(createRelationshipWarning(relationshipSummary));
    }

    // Media trend notifications
    const mediaStats = MediaEngine.getMediaStats();
    if (mediaStats.recentSentiment < -0.3) {
      newNotifications.push(createTrendNotification('negative', mediaStats));
    } else if (mediaStats.recentSentiment > 0.5) {
      newNotifications.push(createTrendNotification('positive', mediaStats));
    }

    setNotifications(prev => [...newNotifications, ...prev.slice(0, 20)]);
    setUnreadCount(newNotifications.length);
  };

  const shouldNotifyAboutMedia = (media: MediaItem): boolean => {
    return media.impact > 0.7 || 
           media.sentiment === 'negative' && media.impact > 0.4 ||
           media.type === 'breaking';
  };

  const createMediaNotification = (media: MediaItem): MediaNotification => {
    const priority = media.impact > 0.8 ? 'critical' : 
                    media.impact > 0.6 ? 'high' : 
                    media.impact > 0.4 ? 'medium' : 'low';

    return {
      id: `media-${media.id}`,
      type: 'media',
      priority,
      title: media.sentiment === 'negative' ? 'Negative Press Alert' : 'Media Coverage',
      message: media.headline,
      timestamp: { week: gameState.currentWeek, year: gameState.currentYear },
      read: false,
      actionable: media.sentiment === 'negative',
      relatedId: media.id
    };
  };

  const createCrisisNotification = (crisis: Crisis): MediaNotification => {
    const priority = crisis.severity === 'critical' ? 'critical' :
                    crisis.severity === 'major' ? 'high' : 'medium';

    return {
      id: `crisis-${crisis.id}`,
      type: 'crisis',
      priority,
      title: `${crisis.severity.toUpperCase()} Crisis`,
      message: crisis.title,
      timestamp: { week: crisis.triggerWeek, year: crisis.triggerYear },
      read: false,
      actionable: true,
      relatedId: crisis.id
    };
  };

  const createRelationshipWarning = (summary: any): MediaNotification => {
    return {
      id: `relationship-warning-${Date.now()}`,
      type: 'relationship',
      priority: 'medium',
      title: 'Media Relations Warning',
      message: `You have ${summary.enemies} hostile media relationships. Consider improving relations.`,
      timestamp: { week: gameState.currentWeek, year: gameState.currentYear },
      read: false,
      actionable: true
    };
  };

  const createTrendNotification = (trend: 'positive' | 'negative', stats: any): MediaNotification => {
    return {
      id: `trend-${trend}-${Date.now()}`,
      type: 'trend',
      priority: trend === 'negative' ? 'high' : 'medium',
      title: trend === 'negative' ? 'Negative Media Trend' : 'Positive Media Trend',
      message: trend === 'negative' 
        ? 'Your studio is receiving consistently negative coverage'
        : 'Your studio is generating positive buzz in the media',
      timestamp: { week: gameState.currentWeek, year: gameState.currentYear },
      read: false,
      actionable: trend === 'negative'
    };
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleNotificationClick = (notification: MediaNotification) => {
    markAsRead(notification.id);
    if (onNotificationAction) {
      onNotificationAction(notification);
    }
  };

  const getPriorityIcon = (priority: MediaNotification['priority']) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <TrendingDown className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: MediaNotification['priority']) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'medium':
        return 'outline';
      case 'low':
        return 'outline';
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const displayNotifications = showAll ? notifications : unreadNotifications.slice(0, 5);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Media Alerts</CardTitle>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Recent' : 'Show All'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-2">
            {displayNotifications.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent media alerts</p>
              </div>
            ) : (
              displayNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    notification.read 
                      ? 'bg-muted/50 border-muted' 
                      : 'bg-background border-border hover:bg-muted/30'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between space-x-2">
                    <div className="flex items-start space-x-2 flex-1">
                      {getPriorityIcon(notification.priority)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={`text-sm font-medium ${
                            notification.read ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                            {notification.title}
                          </h4>
                          <Badge 
                            variant={getPriorityColor(notification.priority)}
                            className="text-xs"
                          >
                            {notification.priority}
                          </Badge>
                        </div>
                        <p className={`text-xs ${
                          notification.read ? 'text-muted-foreground' : 'text-muted-foreground'
                        }`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Week {notification.timestamp.week}, {notification.timestamp.year}
                          </span>
                          {notification.actionable && (
                            <Badge variant="outline" className="text-xs">
                              Action Required
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notification.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};