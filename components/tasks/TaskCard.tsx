import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CircleCheck as CheckCircle, Circle, Clock, Star } from 'lucide-react-native';
import { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  disabled?: boolean;
}

export default function TaskCard({ task, onComplete, disabled = false }: TaskCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'fitness':
        return '#10B981';
      case 'work':
        return '#3B82F6';
      case 'study':
        return '#8B5CF6';
      case 'personal':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const formatTimeRemaining = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    
    if (diff < 0) return 'Overdue';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={task.isCompleted ? ['#10B981', '#059669'] : ['#FFFFFF', '#F9FAFB']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={[
              styles.title,
              { color: task.isCompleted ? '#FFFFFF' : '#111827' }
            ]}>
              {task.title}
            </Text>
            <TouchableOpacity
              onPress={() => onComplete(task.id)}
              disabled={disabled || task.isCompleted}
              style={styles.checkButton}
            >
              {task.isCompleted ? (
                <CheckCircle size={24} color="#FFFFFF" />
              ) : (
                <Circle size={24} color="#8B5CF6" />
              )}
            </TouchableOpacity>
          </View>
          
          {task.description && (
            <Text style={[
              styles.description,
              { color: task.isCompleted ? '#E5E7EB' : '#6B7280' }
            ]}>
              {task.description}
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.categoryContainer}>
            <View 
              style={[
                styles.categoryDot, 
                { backgroundColor: getCategoryColor(task.category) }
              ]} 
            />
            <Text style={[
              styles.categoryText,
              { color: task.isCompleted ? '#E5E7EB' : '#6B7280' }
            ]}>
              {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
            </Text>
          </View>

          <View style={styles.rightSection}>
            <View style={styles.timeContainer}>
              <Clock 
                size={14} 
                color={task.isCompleted ? '#E5E7EB' : '#6B7280'} 
              />
              <Text style={[
                styles.timeText,
                { color: task.isCompleted ? '#E5E7EB' : '#6B7280' }
              ]}>
                {task.isCompleted ? 'Completed' : formatTimeRemaining(task.dueDate)}
              </Text>
            </View>

            <View style={styles.rewardContainer}>
              <Star 
                size={14} 
                color="#F59E0B" 
                fill={task.isCompleted ? "#F59E0B" : "transparent"}
              />
              <Text style={[
                styles.rewardText,
                { color: task.isCompleted ? '#FFFFFF' : '#F59E0B' }
              ]}>
                {task.creditReward}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gradient: {
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  checkButton: {
    padding: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
  },
});