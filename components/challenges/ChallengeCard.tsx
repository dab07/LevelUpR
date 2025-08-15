import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Users, Coins, CircleCheck as CheckCircle, Circle as XCircle, Camera, Vote, AlertTriangle } from 'lucide-react-native';
import { Challenge, Bet } from '@/types';
import { challengeService } from '@/services/challengeService';
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
    const [submittingProof, setSubmittingProof] = useState(false);
    const [currentPhase, setCurrentPhase] = useState<ChallengePhase>('betting');

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
        return (
            currentPhase === 'verification' &&
            userBet &&
            !isCreator &&
            challenge.proofImageUrl
        );
    };

    const handleOpenModal = () => {
        setShowBettingModal(true);
    };

    const handleVote = async (vote: 'yes' | 'no') => {
        try {
            await challengeService.voteOnCompletion(challenge.id, vote);
            Alert.alert('Success', 'Vote submitted successfully!');
            onVoteSubmitted();
        } catch (error: any) {
            console.error('Error voting:', error);
            Alert.alert('Error', error.message || 'Failed to submit vote.');
        }
        // Alert.alert(
        //     'Cast Vote',
        //     `Vote "${vote.toUpperCase()}" on this challenge completion?`,
        //     [
        //         { text: 'Cancel', style: 'cancel' },
        //         {
        //             text: 'Confirm',
        //             onPress: async () => {
        //                 try {
        //                     await challengeService.voteOnCompletion(challenge.id, vote);
        //                     Alert.alert('Success', 'Vote submitted successfully!');
        //                     onVoteSubmitted();
        //                 } catch (error: any) {
        //                     console.error('Error voting:', error);
        //                     Alert.alert('Error', error.message || 'Failed to submit vote.');
        //                 }
        //             }
        //         }
        //     ]
        // );
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
            <View style={styles.container}>
                <LinearGradient
                    colors={['#FFFFFF', '#F9FAFB']}
                    style={styles.gradient}
                >
                    <View style={styles.header}>
                        <View style={styles.titleSection}>
                            <Text style={styles.title} numberOfLines={2}>
                                {challenge.title}
                            </Text>
                            <Text style={styles.description} numberOfLines={3}>
                                {challenge.description}
                            </Text>
                        </View>

                        <View style={[styles.statusBadge, { backgroundColor: getPhaseColor() }]}>
                            <Text style={styles.statusText}>{getPhaseText()}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Clock size={16} color="#6B7280" />
                            <Text style={styles.infoText}>
                                {getPhaseTimeDisplay()}
                            </Text>
                        </View>

                        <View style={styles.infoItem}>
                            <Coins size={16} color="#F59E0B" />
                            <Text style={styles.infoText}>
                                {challenge.minimumBet} min bet
                            </Text>
                        </View>

                        <View style={styles.infoItem}>
                            <Users size={16} color="#8B5CF6" />
                            <Text style={styles.infoText}>
                                {Math.floor(getTotalPool() / challenge.minimumBet)} bets
                            </Text>
                        </View>
                    </View>

                    {getTotalPool() > 0 && (
                        <View style={styles.bettingInfo}>
                            <Text style={styles.poolTitle}>Betting Pool: {getTotalPool()} credits</Text>
                            <View style={styles.bettingStats}>
                                <View style={styles.betStat}>
                                    <CheckCircle size={16} color="#10B981" />
                                    <Text style={styles.betStatText}>
                                        SUCCESS: {challenge.totalYesBets} ({getOdds('yes')})
                                    </Text>
                                </View>
                                <View style={styles.betStat}>
                                    <XCircle size={16} color="#EF4444" />
                                    <Text style={styles.betStatText}>
                                        FAILURE: {challenge.totalNoBets} ({getOdds('no')})
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {userBet && userBet.betType && (
                        <View style={styles.userBetInfo}>
                            <Text style={styles.userBetText}>
                                Your bet: {userBet.amount} credits on `{userBet.betType.toUpperCase()}`
                            </Text>
                        </View>
                    )}

                    {challenge.proofImageUrl && (
                        <View style={styles.proofSection}>
                            <Text style={styles.proofTitle}>Submitted Proof:</Text>
                            <Image source={{ uri: challenge.proofImageUrl }} style={styles.proofImage} />
                        </View>
                    )}

                    <View style={styles.actions}>
                        {/* Betting Phase */}
                        {canPlaceBet() && (
                            <TouchableOpacity
                                onPress={handleOpenModal}
                                style={styles.betButton}
                            >
                                <Coins size={20} color="#FFFFFF" />
                                <Text style={styles.betButtonText}>Place Bet</Text>
                            </TouchableOpacity>
                        )}

                        {/* Proof Submission Phase */}
                        {canSubmitProof() && (
                            <TouchableOpacity
                                onPress={handleOpenModal}
                                style={styles.proofButton}
                                disabled={submittingProof}
                            >
                                <Camera size={20} color="#FFFFFF" />
                                <Text style={styles.proofButtonText}>Submit Proof</Text>
                            </TouchableOpacity>
                        )}

                        {/* Verification Phase */}
                        {canVote() && (
                            <TouchableOpacity
                                onPress={handleOpenModal}
                                style={styles.voteButton}
                            >
                                <Vote size={20} color="#FFFFFF" />
                                <Text style={styles.voteButtonText}>Vote on Proof</Text>
                            </TouchableOpacity>
                        )}

                        {/* Waiting States */}
                        {currentPhase === 'waiting_for_proof' && (
                            <View style={styles.waitingState}>
                                <AlertTriangle size={16} color="#F59E0B" />
                                <Text style={styles.waitingText}>
                                    {isCreator ? 'You can submit proof after deadline' : 'Waiting for creator to submit proof'}
                                </Text>
                            </View>
                        )}

                        {currentPhase === 'proof_submission' && !isCreator && (
                            <View style={styles.waitingState}>
                                <Clock size={16} color="#F59E0B" />
                                <Text style={styles.waitingText}>Creator has {CHALLENGE_CONFIG.PROOF_SUBMISSION_HOURS} hours to submit proof</Text>
                            </View>
                        )}

                        {currentPhase === 'verification' && !canVote() && (
                            <View style={styles.waitingState}>
                                <Vote size={16} color="#3B82F6" />
                                <Text style={styles.waitingText}>
                                    {isCreator ? 'Group members are voting on your proof' : 'Verification in progress'}
                                </Text>
                            </View>
                        )}
                    </View>
                </LinearGradient>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    titleSection: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    infoText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    bettingInfo: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    poolTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
    },
    bettingStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    betStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    betStatText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#374151',
    },
    userBetInfo: {
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        padding: 8,
        borderRadius: 6,
        marginBottom: 12,
    },
    userBetText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#8B5CF6',
        textAlign: 'center',
    },
    proofSection: {
        marginBottom: 12,
    },
    proofTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    proofImage: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    actions: {
        gap: 8,
    },
    betButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8B5CF6',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    betButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    proofButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10B981',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    proofButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    voteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    voteButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    waitingState: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
    },
    waitingText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#F59E0B',
        textAlign: 'center',
        flex: 1,
    },
});
