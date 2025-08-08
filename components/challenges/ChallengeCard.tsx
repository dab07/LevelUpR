import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Clock, Users, Coins, CircleCheck as CheckCircle, Circle as XCircle, Camera, Vote } from 'lucide-react-native';
import { Challenge, Bet } from '@/types';
import { challengeService } from '@/services/challengeService';
import BettingModal from './BettingModal';

interface ChallengeCardProps {
    challenge: Challenge;
    userBet?: Bet;
    onBetPlaced: () => void;
    onVoteSubmitted: () => void;
    isCreator: boolean;
}

export default function ChallengeCard({
                                          challenge,
                                          userBet,
                                          onBetPlaced,
                                          onVoteSubmitted,
                                          isCreator
                                      }: ChallengeCardProps) {
    const [showBettingModal, setShowBettingModal] = useState(false);
    const [submittingProof, setSubmittingProof] = useState(false);

    const getStatusColor = () => {
        switch (challenge.status) {
            case 'active':
                return '#10B981';
            case 'voting':
                return '#F59E0B';
            case 'completed':
                return challenge.isCompleted ? '#10B981' : '#EF4444';
            default:
                return '#6B7280';
        }
    };

    const getStatusText = () => {
        switch (challenge.status) {
            case 'active':
                return 'Active';
            case 'voting':
                return 'Voting';
            case 'completed':
                return challenge.isCompleted ? 'Completed' : 'Failed';
            default:
                return 'Unknown';
        }
    };

    const formatTimeRemaining = () => {
        const now = new Date();
        const deadline = new Date(challenge.deadline);
        const diff = deadline.getTime() - now.getTime();

        if (diff < 0) return 'Expired';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `${days}d ${hours}h left`;
        if (hours > 0) return `${hours}h ${minutes}m left`;
        return `${minutes}m left`;
    };

    const formatVotingTimeRemaining = () => {
        if (!challenge.votingEndsAt) return '';

        const now = new Date();
        const votingEnd = new Date(challenge.votingEndsAt);
        const diff = votingEnd.getTime() - now.getTime();

        if (diff < 0) return 'Voting ended';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}h ${minutes}m voting left`;
    };

    const handleSubmitProof = async () => {
        // setSubmittingProof(true);
        // try {
        //     // Simulate proof submission
        //     await challengeService.submitProof(
        //         challenge.id,
        //         'mock_image_url.jpg'
        //     );
        //     Alert.alert('Success', 'Proof submitted! Voting period has started.');
        //     onBetPlaced(); // Refresh challenge data
        // } catch (error) {
        //     console.error('Error submitting proof:', error);
        //     Alert.alert('Error', 'Failed to submit proof. Please try again.');
        // } finally {
        //     setSubmittingProof(false);
        // }
        Alert.alert(
            'Submit Proof',
            'Photo upload feature coming soon! For now, proof submission is simulated.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Submit',
                    onPress: async () => {
                        setSubmittingProof(true);
                        try {
                            // Simulate proof submission
                            await challengeService.submitProof(
                                challenge.id,
                                'mock_image_url.jpg'
                            );
                            Alert.alert('Success', 'Proof submitted! Voting period has started.');
                            onBetPlaced(); // Refresh challenge data
                        } catch (error) {
                            console.error('Error submitting proof:', error);
                            Alert.alert('Error', 'Failed to submit proof. Please try again.');
                        } finally {
                            setSubmittingProof(false);
                        }
                    }
                }
            ]
        );
    };

    const handleVote = (vote: 'yes' | 'no') => {
        // try {
        //     await challengeService.voteOnCompletion(challenge.id, vote);
        //     Alert.alert('Success', 'Vote submitted successfully!');
        //     onVoteSubmitted();
        // } catch (error: any) {
        //     console.error('Error voting:', error);
        //     Alert.alert('Error', error.message || 'Failed to submit vote.');
        // }
        Alert.alert(
            'Cast Vote',
            `Vote "${vote.toUpperCase()}" on this challenge completion?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            await challengeService.voteOnCompletion(challenge.id, vote);
                            Alert.alert('Success', 'Vote submitted successfully!');
                            onVoteSubmitted();
                        } catch (error: any) {
                            console.error('Error voting:', error);
                            Alert.alert('Error', error.message || 'Failed to submit vote.');
                        }
                    }
                }
            ]
        );
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

                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                            <Text style={styles.statusText}>{getStatusText()}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Clock size={16} color="#6B7280" />
                            <Text style={styles.infoText}>
                                {challenge.status === 'voting' ? formatVotingTimeRemaining() : formatTimeRemaining()}
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
                                        YES: {challenge.totalYesBets} ({getOdds('yes')})
                                    </Text>
                                </View>
                                <View style={styles.betStat}>
                                    <XCircle size={16} color="#EF4444" />
                                    <Text style={styles.betStatText}>
                                        NO: {challenge.totalNoBets} ({getOdds('no')})
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {userBet && (
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
                        {challenge.status === 'active' && !userBet && (
                            <TouchableOpacity
                                onPress={() => setShowBettingModal(true)}
                                style={styles.betButton}
                            >
                                <Coins size={20} color="#FFFFFF" />
                                <Text style={styles.betButtonText}>Place Bet</Text>
                            </TouchableOpacity>
                        )}

                        {challenge.status === 'active' && isCreator && !challenge.proofImageUrl && (
                            <TouchableOpacity
                                onPress={handleSubmitProof}
                                style={styles.proofButton}
                                disabled={submittingProof}
                            >
                                <Camera size={20} color="#FFFFFF" />
                                <Text style={styles.proofButtonText}>
                                    {submittingProof ? 'Submitting...' : 'Submit Proof'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {challenge.status === 'voting' && userBet && !isCreator && (
                            <View style={styles.votingButtons}>
                                <TouchableOpacity
                                    onPress={() => handleVote('yes')}
                                    style={[styles.voteButton, styles.yesButton]}
                                >
                                    <CheckCircle size={16} color="#FFFFFF" />
                                    <Text style={styles.voteButtonText}>YES</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => handleVote('no')}
                                    style={[styles.voteButton, styles.noButton]}
                                >
                                    <XCircle size={16} color="#FFFFFF" />
                                    <Text style={styles.voteButtonText}>NO</Text>
                                </TouchableOpacity>
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
    votingButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    voteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 4,
    },
    yesButton: {
        backgroundColor: '#10B981',
    },
    noButton: {
        backgroundColor: '#EF4444',
    },
    voteButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
