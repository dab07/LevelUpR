import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
    <View className="my-2 rounded-2xl overflow-hidden shadow-sm shadow-black/10">
      <LinearGradient
        colors={task.isCompleted ? ['#10B981', '#059669'] : ['#FFFFFF', '#F9FAFB']}
        className="p-4"
      >
        <View className="mb-3">
          <View className="flex-row justify-between items-start mb-2">
            <Text className={`text-base font-semibold flex-1 mr-3 ${
              task.isCompleted ? 'text-white' : 'text-gray-900'
            }`}>
              {task.title}
            </Text>
            <TouchableOpacity
              onPress={() => onComplete(task.id)}
              disabled={disabled || task.isCompleted}
              className="p-1"
            >
              {task.isCompleted ? (
                <CheckCircle size={24} color="#FFFFFF" />
              ) : (
                <Circle size={24} color="#8B5CF6" />
              )}
            </TouchableOpacity>
          </View>
          
          {task.description && (
            <Text className={`text-sm leading-5 ${
              task.isCompleted ? 'text-gray-200' : 'text-gray-500'
            }`}>
              {task.description}
            </Text>
          )}
        </View>

        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <View 
              className="w-2 h-2 rounded-full mr-1.5"
              style={{ backgroundColor: getCategoryColor(task.category) }}
            />
            <Text className={`text-xs font-medium ${
              task.isCompleted ? 'text-gray-200' : 'text-gray-500'
            }`}>
              {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
            </Text>
          </View>

          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Clock 
                size={14} 
                color={task.isCompleted ? '#E5E7EB' : '#6B7280'} 
              />
              <Text className={`text-xs font-medium ${
                task.isCompleted ? 'text-gray-200' : 'text-gray-500'
              }`}>
                {task.isCompleted ? 'Completed' : formatTimeRemaining(task.dueDate)}
              </Text>
            </View>

            <View className="flex-row items-center gap-1">
              <Star 
                size={14} 
                color="#F59E0B" 
                fill={task.isCompleted ? "#F59E0B" : "transparent"}
              />
              <Text className={`text-xs font-semibold ${
                task.isCompleted ? 'text-white' : 'text-amber-500'
              }`}>
                {task.creditReward}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

