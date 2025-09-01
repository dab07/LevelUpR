import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { X, Coins, TrendingUp, CircleCheck as CheckCircle, Circle as XCircle, Camera, Upload, Trash2, Clock, Vote } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Challenge, Bet } from '@/types';
import { challengeService } from '@/services/challengeService';
import { creditService } from '@/services/creditService';
import { supabase } from '@/lib/supabase';
import { CHALLENGE_CONFIG } from '@/lib/config';

interface BettingModalProps {
  visible: boolean;
  onClose: () => void;
  challenge: Challenge | null;
  onBetPlaced: () => void;
  userCredits?: number;
  isCreator?: boolean;
  userBet?: Bet;
}

interface PhotoSubmission {
  id: string;
  uri: string;
  type: string;
  name: string;
  size?: number;
}

interface VotingData {
  photos: PhotoSubmission[];
  description: string;
}

type ChallengePhase = 'betting' | 'waiting_for_proof' | 'proof_submission' | 'verification' | 'completed';

export default function BettingModal({
  visible,
  onClose,
  challenge,
  onBetPlaced,
  userCredits: parentUserCredits,
  isCreator = false,
  userBet
}: BettingModalProps) {
  // Betting state
  const [betType, setBetType] = useState<'yes' | 'no'>('yes');
  const [betAmount, setBetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [userCredits, setUserCredits] = useState(0);

  // Proof submission state
  const [votingData, setVotingData] = useState<VotingData>({
    photos: [],
    description: ''
  });
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Voting state
  const [hasVoted, setHasVoted] = useState(false);
  const [votingLoading, setVotingLoading] = useState(false);

  // User and phase state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPhase, setCurrentPhase] = useState<ChallengePhase>('betting');

  // Safe challenge access with null protection
  const safeChallenge = challenge ? {
    id: challenge.id,
    title: challenge.title || 'Unknown Challenge',
    description: challenge.description || 'No description available',
    minimumBet: challenge.minimumBet || 1,
    deadline: challenge.deadline,
    status: challenge.status || 'active',
    totalYesBets: challenge.totalYesBets || 0,
    totalNoBets: challenge.totalNoBets || 0,
    totalCreditsPool: challenge.totalCreditsPool || 0,
    proofImageUrl: challenge.proofImageUrl,
    proofSubmittedAt: challenge.proofSubmittedAt,
    votingEndsAt: challenge.votingEndsAt,
    creatorId: challenge.creatorId,
    isCompleted: challenge.isCompleted
  } : null;

  // Initialize component state
  useEffect(() => {
    if (visible && safeChallenge) {
      setBetAmount(safeChallenge.minimumBet.toString());
      loadUserCredits();
      getCurrentUser();
      setCurrentPhase(determineCurrentPhase());
      checkVotingStatus();
    }
  }, [visible, safeChallenge]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      resetState();
    }
  }, [visible]);

  const resetState = () => {
    setBetType('yes');
    setBetAmount('');
    setVotingData({ photos: [], description: '' });
    setUploadProgress(0);
    setHasVoted(false);
  };

  // Placeholder functions - implement as needed
  const loadUserCredits = async () => {
    // Implementation needed
  };

  const getCurrentUser = async () => {
    // Implementation needed
  };

  const determineCurrentPhase = (): ChallengePhase => {
    return 'betting'; // Simplified for now
  };

  const checkVotingStatus = async () => {
    // Implementation needed
  };

  const canPlaceBet = () => {
    return currentPhase === 'betting' && !userBet;
  };

  const canSubmitProof = () => {
    return currentPhase === 'proof_submission' && isCreator;
  };

  const canVote = () => {
    return currentPhase === 'verification' && !hasVoted && !isCreator;
  };

  const handlePlaceBet = async () => {
    // Implementation needed
  };

  const getPhaseTitle = () => {
    switch (currentPhase) {
      case 'betting':
        return 'Place Your Bet';
      case 'proof_submission':
        return 'Submit Proof';
      case 'verification':
        return 'Vote on Completion';
      default:
        return 'Challenge Details';
    }
  };

  const getPhaseDescription = () => {
    return 'Challenge in progress';
  };

  const calculatePotentialPayout = () => {
    return parseInt(betAmount || '0') * 2; // Simplified calculation
  };

  const getWinChance = () => {
    return 50; // Simplified
  };

  if (!safeChallenge) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
          <TouchableOpacity onPress={onClose} className="p-1">
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">{getPhaseTitle()}</Text>
          <View className="w-8" />
        </View>

        <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
          {/* Challenge Info */}
          <View className="bg-gray-50 p-4 rounded-xl mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-2" numberOfLines={2}>
              {safeChallenge.title}
            </Text>
            <Text className="text-sm text-gray-600 mb-3" numberOfLines={3}>
              {safeChallenge.description}
            </Text>
            <View className="flex-row items-center">
              <Clock size={16} color="#8B5CF6" />
              <Text className="text-sm font-medium text-violet-600 ml-2">{getPhaseDescription()}</Text>
            </View>
          </View>

          {/* Credits Display */}
          <View className="flex-row items-center bg-amber-50 p-3 rounded-lg mb-6">
            <Coins size={20} color="#F59E0B" />
            <Text className="text-base font-semibold text-amber-700 ml-2">
              Available Credits: {userCredits}
            </Text>
          </View>

          {/* Betting Phase */}
          {currentPhase === 'betting' && canPlaceBet() && (
            <>
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-4">Choose Your Prediction</Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setBetType('yes')}
                    className={`flex-1 items-center p-4 rounded-xl ${betType === 'yes' ? 'bg-emerald-600 border-2 border-emerald-700' : 'bg-emerald-500'}`}
                  >
                    <CheckCircle size={20} color="#FFFFFF" />
                    <Text className="text-base font-bold text-white mt-2">SUCCESS</Text>
                    <Text className="text-xs text-emerald-100">Will complete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setBetType('no')}
                    className={`flex-1 items-center p-4 rounded-xl ${betType === 'no' ? 'bg-red-600 border-2 border-red-700' : 'bg-red-500'}`}
                  >
                    <XCircle size={20} color="#FFFFFF" />
                    <Text className="text-base font-bold text-white mt-2">FAILURE</Text>
                    <Text className="text-xs text-red-100">Will fail</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-4">Bet Amount</Text>
                <View className="flex-row items-center bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                  <Coins size={20} color="#F59E0B" style={{ position: 'absolute', left: 12, zIndex: 1 }} />
                  <TextInput
                    className="flex-1 text-lg font-semibold text-gray-900 pl-8 pr-16"
                    value={betAmount}
                    onChangeText={setBetAmount}
                    keyboardType="numeric"
                    placeholder={safeChallenge.minimumBet.toString()}
                  />
                  <Text className="text-sm font-medium text-gray-500">credits</Text>
                </View>
                <Text className="text-xs text-gray-500 mt-2">
                  Minimum: {safeChallenge.minimumBet} credits
                </Text>
              </View>

              <View className="bg-violet-50 p-4 rounded-xl border border-violet-200 mb-6">
                <View className="flex-row items-center mb-3">
                  <TrendingUp size={20} color="#8B5CF6" />
                  <Text className="text-base font-semibold text-violet-800 ml-2">Potential Payout</Text>
                </View>

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm text-violet-700">Your bet:</Text>
                  <Text className="text-sm font-semibold text-violet-900">{betAmount || 0} credits</Text>
                </View>

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm text-violet-700">Potential win:</Text>
                  <Text className="text-sm font-bold text-emerald-600">
                    {calculatePotentialPayout()} credits
                  </Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-violet-700">Win chance:</Text>
                  <Text className="text-sm font-semibold text-violet-900">{getWinChance()}%</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View className="flex-row gap-3 p-5 border-t border-gray-200">
          {currentPhase === 'betting' && canPlaceBet() && (
            <>
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 py-3 rounded-lg items-center justify-center bg-gray-100"
              >
                <Text className="text-base font-semibold text-gray-500">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePlaceBet}
                className="flex-1 py-3 rounded-lg items-center justify-center flex-row bg-violet-600"
                disabled={loading || parseInt(betAmount || '0') < safeChallenge.minimumBet}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Coins size={20} color="#FFFFFF" />
                    <Text className="text-base font-semibold text-white ml-2">Place Bet</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {(currentPhase === 'waiting_for_proof' || currentPhase === 'verification' || currentPhase === 'completed') && (
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-3 rounded-lg items-center justify-center bg-violet-600"
            >
              <Text className="text-base font-semibold text-white">Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}