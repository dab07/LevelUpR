import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Clock, Users, Coins, CircleCheck as CheckCircle, Circle as XCircle, Camera, Vote, AlertTriangle } from 'lucide-react-native';
import { Challenge, Bet } from '@/types';
import { challengeService } from '@/services/challengeService';
import { supabase } from '@/lib/supabase';
import BettingModal from './BettingModal';
import { CHALLENGE_CONFIG } from '@/lib/config';

interface ChallengeCardProps {
    challenge: Challenge;
    userBet?: Bet;
    onBetPlaced: () => void;
    onVoteSubmitted: () => void;
    isCreator: boolean;
}

type ChallengePhase = 'betting' | 'waiting_for_proof' | 'proof_submission' | 'verification' | 'completed';

export default function ChallengeCard({
    challenge,
    userBet,
    onBetPlaced,
    onVoteSubmitted,
    isCreator
}: ChallengeCardProps) {
    const [showBettingModal, setShowBettingModal] = useState(false);
    const [currentPhase, setCurrentPhase] = useState<ChallengePhase>('betting');
    const [votingInProgress, setVotingInProgress] = useState(false);

    // Update phase when challenge changes
    useEffect(() => {
        setCurrentPhase(determineCurrentPhase());
    }, [challenge]);

    const determineCurrentPhase = (): ChallengePhase => {
        const now = new Date();
        const deadline = new Date(challenge.deadline);
        const proofDeadline = new Date(deadline.getTime() + CHALLENGE_CONFIG.PROOF_SUBMISSION_HOURS * 60 * 60 * 1000);

        if (challenge.status === 'completed') {
            return 'completed';
        }

        if (challenge.status === 'voting') {
            return 'verification';
        }

        if (now < deadline) {
            return 'betting';
        }

        if (now >= deadline && now < proofDeadline) {
            if (challenge.proofImageUrl) {
                return 'verification';
            } else {
                return 'proof_submission';
            }
        }

        // Past proof deadline - should be auto-failed
        return 'completed';
    };

    const getPhaseColor = () => {
        switch (currentPhase) {
            case 'betting':
                return '#8B5CF6';
            case 'waiting_for_proof':
            case 'proof_submission':
                return '#F59E0B';
            case 'verification':
                return '#3B82F6';
            case 'completed':
                return challenge.isCompleted ? '#10B981' : '#EF4444';
            default:
                return '#6B7280';
        }
    };

    const getPhaseText = () => {
        switch (currentPhase) {
            case 'betting':
                return 'Betting Open';
            case 'waiting_for_proof':
                return 'Awaiting Proof';
            case 'proof_submission':
                return 'Proof Due';
            case 'verification':
                return 'Verification';
            case 'completed':
                return challenge.isCompleted ? 'Completed' : 'Failed';
            default:
                return 'Unknown';
        }
    };

    const getPhaseTimeDisplay = () => {
        const now = new Date();
        const deadline = new Date(challenge.deadline);
        const proofDeadline = new Date(deadline.getTime() + 3 * 60 * 60 * 1000);

        switch (currentPhase) {
            case 'betting': {
                const diff = deadline.getTime() - now.getTime();
                if (diff < 0) return 'Deadline passed';

                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                if (days > 0) return `${days}d ${hours}h to deadline`;
                if (hours > 0) return `${hours}h ${minutes}m to deadline`;
                return `${minutes}m to deadline`;
            }

            case 'proof_submission': {
                const diff = proofDeadline.getTime() - now.getTime();
                if (diff < 0) return 'Proof deadline passed';

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                return `${hours}h ${minutes}m to submit proof`;
            }

            case 'verification': {
                if (!challenge.votingEndsAt) return 'Verification in progress';

                const votingEnd = new Date(challenge.votingEndsAt);
                const diff = votingEnd.getTime() - now.getTime();

                if (diff < 0) return 'Voting ended';

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                return `${hours}h ${minutes}m voting left`;
            }

            case 'waiting_for_proof':
                return 'Waiting for proof submission';

            case 'completed':
                return challenge.isCompleted ? 'Successfully completed' : 'Challenge failed';

            default:
                return '';
        }
    };

    const canPlaceBet = () => {
        return currentPhase === 'betting' && !userBet;
    };

    const canSubmitProof = () => {
        const now = new Date();
        const deadline = new Date(challenge.deadline);
        const proofDeadline = new Date(deadline.getTime() + 3 * 60 * 60 * 1000);

        return (
            isCreator &&
            currentPhase === 'proof_submission' &&
            now >= deadline &&
            now < proofDeadline &&
            !challenge.proofImageUrl
        );
    };

    const canVote = () => {
        // Use the vote status from the challenge data if available
        if (challenge.userVote) {
            return challenge.userVote.canVote && !votingInProgress;
        }
        
        // Fallback to original logic
        return (
            currentPhase === 'verification' &&
            userBet &&
            !isCreator &&
            challenge.proofImageUrl &&
            !votingInProgress
        );
    };

    const hasVoted = () => {
        // Use the vote status from the challenge data if available
        if (challenge.userVote) {
            return challenge.userVote.hasVoted;
        }
        
        return false;
    };

    const getUserVoteChoice = () => {
        return challenge.userVote?.voteChoice;
    };

    const handleOpenModal = () => {
        setShowBettingModal(true);
    };



    const getTotalPool = () => {
        return challenge.totalYesBets + challenge.totalNoBets;
    };

    const getOdds = (betType: 'yes' | 'no') => {
        const totalPool = getTotalPool();
        if (totalPool === 0) return '1:1';

        const opposingBets = betType === 'yes' ? challenge.totalNoBets : challenge.totalYesBets;
        const sameBets = betType === 'yes' ? challenge.totalYesBets : challenge.totalNoBets;

        if (sameBets === 0) return '1:1';

        const ratio = opposingBets / sameBets;
        return `1:${ratio.toFixed(2)}`;
    };

    return (
        <>
            <View className="my-2 rounded-2xl overflow-hidden bg-[#2A2A2A] border border-gray-700">
                <View className="p-4">
                    <View className="flex-row justify-between items-start mb-3">
                        <View className="flex-1 mr-3">
                            <Text className="text-lg font-semibold text-white mb-1" numberOfLines={2}>
                                {challenge.title}
                            </Text>
                            <Text className="text-sm text-gray-400 leading-5" numberOfLines={3}>
                                {challenge.description}
                            </Text>
                        </View>

                        <View className="px-2 py-1 rounded-xl" style={{ backgroundColor: getPhaseColor() }}>
                            <Text className="text-xs font-semibold text-white">{getPhaseText()}</Text>
                        </View>
                    </View>

                    <View className="flex-row justify-between mb-3">
                        <View className="flex-row items-center gap-1">
                            <Clock size={16} color="#9CA3AF" />
                            <Text className="text-xs text-gray-400 font-medium">
                                {getPhaseTimeDisplay()}
                            </Text>
                        </View>

                        <View className="flex-row items-center gap-1">
                            <Coins size={16} color="#F59E0B" />
                            <Text className="text-xs text-gray-400 font-medium">
                                {challenge.minimumBet} min Aura
                            </Text>
                        </View>

                        <View className="flex-row items-center gap-1">
                            <Users size={16} color="#8B5CF6" />
                            <Text className="text-xs text-gray-400 font-medium">
                                {Math.floor(getTotalPool() / challenge.minimumBet)} Aura
                            </Text>
                        </View>
                    </View>

                    {getTotalPool() > 0 && (
                        <View className="bg-[#1A1A1A] p-3 rounded-lg mb-3 border border-gray-600">
                            <Text className="text-sm font-semibold text-white mb-2 text-center">Stack Vote: {getTotalPool()} Aura</Text>
                            <View className="flex-row justify-around">
                                <View className="flex-row items-center gap-1">
                                    <CheckCircle size={16} color="#10B981" />
                                    <Text className="text-xs font-medium text-gray-300">
                                        SUCCESS: {challenge.totalYesBets} ({getOdds('yes')})
                                    </Text>
                                </View>
                                <View className="flex-row items-center gap-1">
                                    <XCircle size={16} color="#EF4444" />
                                    <Text className="text-xs font-medium text-gray-300">
                                        FAILURE: {challenge.totalNoBets} ({getOdds('no')})
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {userBet && userBet.betType && (
                        <View className="bg-[#8A83DA]/20 p-2 rounded-md mb-3 border border-[#8A83DA]/30">
                            <Text className="text-xs font-medium text-[#8A83DA] text-center">
                                Your Aura: {userBet.amount} on {userBet.betType.toUpperCase()}
                            </Text>
                        </View>
                    )}

                    {challenge.proofImageUrl && (
                        <View className="mb-3">
                            <Text className="text-sm font-semibold text-white mb-2">Submitted Proof:</Text>
                            <Image source={{ uri: challenge.proofImageUrl }} className="w-full h-[120px] rounded-lg bg-[#1A1A1A]" />
                        </View>
                    )}

                    <View className="gap-2">
                        {/* Betting Phase */}
                        {canPlaceBet() && (
                            <TouchableOpacity
                                onPress={handleOpenModal}
                                className="flex-row items-center justify-center bg-violet-600 py-2.5 rounded-lg gap-1.5"
                            >
                                <Coins size={20} color="#FFFFFF" />
                                <Text className="text-sm font-semibold text-white">Commit Aura</Text>
                            </TouchableOpacity>
                        )}

                        {/* Proof Submission Phase */}
                        {canSubmitProof() && (
                            <TouchableOpacity
                                onPress={handleOpenModal}
                                className="flex-row items-center justify-center bg-emerald-600 py-2.5 rounded-lg gap-1.5"
                            >
                                <Camera size={20} color="#FFFFFF" />
                                <Text className="text-sm font-semibold text-white">Submit Proof</Text>
                            </TouchableOpacity>
                        )}

                        {/* Verification Phase */}
                        {canVote() && (
                            <TouchableOpacity
                                onPress={handleOpenModal}
                                className={`flex-row items-center justify-center py-2.5 rounded-lg gap-1.5 ${votingInProgress ? 'bg-gray-400 opacity-70' : 'bg-blue-600'}`}
                                disabled={votingInProgress}
                            >
                                <Vote size={20} color="#FFFFFF" />
                                <Text className="text-sm font-semibold text-white">
                                    {votingInProgress ? 'Submitting Vote...' : 'Vote on Proof'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Show voting status if user has already voted */}
                        {hasVoted() && currentPhase === 'verification' && userBet && !isCreator && (
                            <View className="flex-row items-center justify-center py-3 px-4 rounded-lg gap-2 border" style={{
                                backgroundColor: getUserVoteChoice() === 'yes' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                borderColor: getUserVoteChoice() === 'yes' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                            }}>
                                {getUserVoteChoice() === 'yes' ? (
                                    <CheckCircle size={16} color="#10B981" />
                                ) : (
                                    <XCircle size={16} color="#EF4444" />
                                )}
                                <Text className="text-xs font-semibold text-center flex-1" style={{
                                    color: getUserVoteChoice() === 'yes' ? '#10B981' : '#EF4444'
                                }}>
                                    You voted {getUserVoteChoice()?.toUpperCase()} on this proof
                                </Text>
                            </View>
                        )}

                        {/* Show loading state while checking vote status */}
                        {/* Show voting status for completed challenges */}
                        {hasVoted() && currentPhase === 'completed' && userBet && !isCreator && (
                            <View className="flex-row items-center justify-center py-3 px-4 rounded-lg gap-2 border" style={{
                                backgroundColor: getUserVoteChoice() === 'yes' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                borderColor: getUserVoteChoice() === 'yes' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                            }}>
                                {getUserVoteChoice() === 'yes' ? (
                                    <CheckCircle size={16} color="#10B981" />
                                ) : (
                                    <XCircle size={16} color="#EF4444" />
                                )}
                                <Text className="text-xs font-semibold text-center flex-1" style={{
                                    color: getUserVoteChoice() === 'yes' ? '#10B981' : '#EF4444'
                                }}>
                                    You voted {getUserVoteChoice()?.toUpperCase()} on this challenge
                                </Text>
                            </View>
                        )}

                        {/* Show voting in progress state */}
                        {votingInProgress && currentPhase === 'verification' && userBet && !isCreator && (
                            <View className="flex-row items-center justify-center bg-amber-500/20 py-3 px-4 rounded-lg gap-2 border border-amber-500/30">
                                <Vote size={16} color="#3B82F6" />
                                <Text className="text-xs font-medium text-amber-400 text-center flex-1">Submitting your vote...</Text>
                            </View>
                        )}

                        {/* Waiting States */}
                        {currentPhase === 'waiting_for_proof' && (
                            <View className="flex-row items-center justify-center bg-amber-500/20 py-3 px-4 rounded-lg gap-2 border border-amber-500/30">
                                <AlertTriangle size={16} color="#F59E0B" />
                                <Text className="text-xs font-medium text-amber-400 text-center flex-1">
                                    {isCreator ? 'You can submit proof after deadline' : 'Waiting for creator to submit proof'}
                                </Text>
                            </View>
                        )}

                        {currentPhase === 'proof_submission' && !isCreator && (
                            <View className="flex-row items-center justify-center bg-amber-500/20 py-3 px-4 rounded-lg gap-2 border border-amber-500/30">
                                <Clock size={16} color="#F59E0B" />
                                <Text className="text-xs font-medium text-amber-400 text-center flex-1">Creator has {CHALLENGE_CONFIG.PROOF_SUBMISSION_HOURS} hours to submit proof</Text>
                            </View>
                        )}

                        {currentPhase === 'verification' && !canVote() && !hasVoted() && (
                            <View className="flex-row items-center justify-center bg-blue-500/20 py-3 px-4 rounded-lg gap-2 border border-blue-500/30">
                                <Vote size={16} color="#3B82F6" />
                                <Text className="text-xs font-medium text-blue-400 text-center flex-1">
                                    {isCreator ? 'Group members are voting on your proof' : 'Verification in progress'}
                                </Text>
                            </View>
                        )}

                        {currentPhase === 'verification' && hasVoted() && !isCreator && (
                            <View className="flex-row items-center justify-center bg-emerald-500/20 py-3 px-4 rounded-lg gap-2 border border-emerald-500/30">
                                <Vote size={16} color="#10B981" />
                                <Text className="text-xs font-medium text-emerald-400 text-center flex-1">
                                    Your vote has been submitted. Waiting for other votes...
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            <BettingModal
                visible={showBettingModal}
                onClose={() => setShowBettingModal(false)}
                challenge={challenge}
                onBetPlaced={() => {
                    setShowBettingModal(false);
                    onBetPlaced();
                }}
                isCreator={isCreator}
                userBet={userBet}
            />
        </>
    );
}


