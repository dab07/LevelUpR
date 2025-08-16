import { supabase } from '@/lib/supabase';
import { Challenge, Bet } from '@/types';
import { creditService } from './creditService';
import { getCurrentUserId } from '@/lib/supabase';
import { CHALLENGE_CONFIG } from '@/lib/config';

class ChallengeService {
    async createChallenge(challengeData: Omit<Challenge, 'id' | 'creatorId' | 'status' | 'totalYesBets' | 'totalNoBets' | 'totalCreditsPool' | 'completionVotes' | 'createdAt' | 'updatedAt'>): Promise<Challenge> {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('challenges')
            .insert({
                creator_id: userId,
                title: challengeData.title,
                description: challengeData.description,
                minimum_bet: challengeData.minimumBet,
                deadline: challengeData.deadline,
                is_global: challengeData.isGlobal,
                group_id: challengeData.groupId,
                status: 'active',
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async placeBet(userId: string, challengeId: string, betType: 'yes' | 'no', amount: number): Promise<void> {
        if (!userId) throw new Error('User not authenticated');

        // Check if challenge is still active
        const { data: challenge, error: challengeError } = await supabase
            .from('challenges')
            .select('status, deadline')
            .eq('id', challengeId)
            .single();

        if (challengeError) throw challengeError;

        if (challenge.status !== 'active' || new Date(challenge.deadline) < new Date()) {
            throw new Error('Challenge is no longer accepting bets');
        }

        // Check if user has enough credits
        const hasEnoughCredits = await creditService.deductCredits(
            userId,
            amount,
            'bet',
            `Bet on challenge: ${betType}`,
            challengeId
        );

        if (!hasEnoughCredits) {
            throw new Error('Insufficient credits');
        }

        // Place the bet
        const { error: betError } = await supabase
            .from('bets')
            .insert({
                user_id: userId,
                challenge_id: challengeId,
                bet_type: betType,
                amount,
            });

        if (betError) throw betError;

        // Update challenge totals
        await supabase.rpc('update_challenge_bets', {
            challenge_id: challengeId,
            bet_type: betType,
            bet_amount: amount,
        });
    }

    async submitProof(challengeId: string, imageUrl: string, description?: string): Promise<void> {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('User not authenticated');

        // Check if we're in the correct time window for proof submission
        const { data: challenge, error: challengeError } = await supabase
            .from('challenges')
            .select('deadline, status, creator_id')
            .eq('id', challengeId)
            .single();

        if (challengeError) throw challengeError;

        if (challenge.creator_id !== userId) {
            throw new Error('Only the challenge creator can submit proof');
        }

        const now = new Date();
        const deadline = new Date(challenge.deadline);
        const proofDeadline = new Date(deadline.getTime() + CHALLENGE_CONFIG.PROOF_SUBMISSION_HOURS * 60 * 60 * 1000);

        if (now < deadline) {
            throw new Error('Cannot submit proof before the challenge deadline');
        }

        if (now > proofDeadline) {
            throw new Error('Proof submission deadline has passed');
        }

        const { error } = await supabase
            .from('challenges')
            .update({
                proof_image_url: imageUrl,
                proof_description: description,
                proof_submitted_at: new Date().toISOString(),
                status: 'voting',
                voting_ends_at: new Date(Date.now() + CHALLENGE_CONFIG.VOTING_DURATION_HOURS * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', challengeId);

        if (error) throw error;
    }

    async voteOnCompletion(challengeId: string, vote: 'yes' | 'no'): Promise<void> {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('User not authenticated');

        // Check if user has bet on this challenge
        const { data: bet, error: betError } = await supabase
            .from('bets')
            .select('id')
            .eq('challenge_id', challengeId)
            .eq('user_id', userId)
            .single();

        if (betError) throw new Error('You must have bet on this challenge to vote');

        // Check if voting is still open
        const { data: challenge, error: challengeError } = await supabase
            .from('challenges')
            .select('status, voting_ends_at')
            .eq('id', challengeId)
            .single();

        if (challengeError) throw challengeError;

        if (challenge.status !== 'voting' || new Date(challenge.voting_ends_at) < new Date()) {
            throw new Error('Voting period has ended');
        }

        // Submit vote
        const { error: voteError } = await supabase
            .from('completion_votes')
            .upsert({
                challenge_id: challengeId,
                user_id: userId,
                vote,
            });

        if (voteError) throw voteError;
    }

    async getUserBet(challengeId: string): Promise<Bet | null> {
        const userId = await getCurrentUserId();
        if (!userId) return null;

        const { data, error } = await supabase
            .from('bets')
            .select('*')
            .eq('challenge_id', challengeId)
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) return null;

        // Map database fields to TypeScript interface
        return {
            id: data.id,
            userId: data.user_id,
            challengeId: data.challenge_id,
            betType: data.bet_type,
            amount: data.amount,
            payout: data.payout,
            createdAt: data.created_at
        };
    }

    async getGroupChallenges(groupId: string): Promise<Challenge[]> {
        // First, update any challenges that need status updates
        await this.updateChallengeStatuses(groupId);

        const { data, error } = await supabase
            .from('challenges')
            .select('*')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map database fields to TypeScript interface
        const mappedData = (data || []).map(challenge => ({
            id: challenge.id,
            creatorId: challenge.creator_id,
            title: challenge.title,
            description: challenge.description,
            minimumBet: challenge.minimum_bet,
            deadline: challenge.deadline,
            isGlobal: challenge.is_global,
            groupId: challenge.group_id,
            status: challenge.status,
            proofImageUrl: challenge.proof_image_url,
            proofSubmittedAt: challenge.proof_submitted_at,
            votingEndsAt: challenge.voting_ends_at,
            totalYesBets: challenge.total_yes_bets,
            totalNoBets: challenge.total_no_bets,
            totalCreditsPool: challenge.total_credits_pool,
            isCompleted: challenge.is_completed,
            completionVotes: challenge.completion_votes,
            createdAt: challenge.created_at,
            updatedAt: challenge.updated_at
        }));

        return mappedData;
    }

    async finalizeChallenge(challengeId: string): Promise<void> {
        try {
            console.log(`Starting finalization for challenge ${challengeId}`);

            // Get challenge and votes
            const { data: challenge, error: challengeError } = await supabase
                .from('challenges')
                .select(`
            *,
            completion_votes(vote),
            bets(user_id, bet_type, amount)
          `)
                .eq('id', challengeId)
                .single();

            if (challengeError) {
                console.error('Error fetching challenge for finalization:', challengeError);
                throw challengeError;
            }

            // Check if already completed to avoid double processing
            if (challenge.status === 'completed') {
                console.log(`Challenge ${challengeId} already completed, skipping finalization`);
                return;
            }

            // Count votes
            const yesVotes = challenge.completion_votes.filter((v: any) => v.vote === 'yes').length;
            const noVotes = challenge.completion_votes.filter((v: any) => v.vote === 'no').length;
            const isCompleted = yesVotes > noVotes;

            console.log(`Challenge ${challengeId} voting results: YES=${yesVotes}, NO=${noVotes}, Completed=${isCompleted}`);

            // Calculate payouts first
            await this.calculatePayouts(challenge, isCompleted);

            // Update challenge status
            const { error: updateError } = await supabase
                .from('challenges')
                .update({
                    status: 'completed',
                    is_completed: isCompleted,
                    completion_votes: { yes: yesVotes, no: noVotes },
                    updated_at: new Date().toISOString(),
                })
                .eq('id', challengeId);

            if (updateError) {
                console.error('Error updating challenge status:', updateError);
                throw updateError;
            }

            console.log(`Challenge ${challengeId} finalized successfully`);
        } catch (error) {
            console.error(`Error finalizing challenge ${challengeId}:`, error);
            // Even if payout calculation fails, we should still mark the challenge as completed
            // to prevent it from being stuck in voting status
            try {
                await supabase
                    .from('challenges')
                    .update({
                        status: 'completed',
                        is_completed: false, // Mark as failed if finalization had errors
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', challengeId);
                console.log(`Challenge ${challengeId} marked as completed despite finalization errors`);
            } catch (fallbackError) {
                console.error(`Failed to update challenge status as fallback:`, fallbackError);
            }
            throw error;
        }
    }

    private async calculatePayouts(challenge: any, isCompleted: boolean): Promise<void> {
        try {
            console.log(`Calculating payouts for challenge ${challenge.id}`);

            // Check if payouts have already been processed to avoid duplicates
            const { data: existingPayouts, error: payoutCheckError } = await supabase
                .from('credit_transactions')
                .select('id')
                .eq('related_id', challenge.id)
                .eq('type', 'payout')
                .limit(1);

            if (payoutCheckError) {
                console.error('Error checking existing payouts:', payoutCheckError);
            } else if (existingPayouts && existingPayouts.length > 0) {
                console.log(`Payouts already processed for challenge ${challenge.id}, skipping`);
                return;
            }

            const yesBets = challenge.bets.filter((b: any) => b.bet_type === 'yes');
            const noBets = challenge.bets.filter((b: any) => b.bet_type === 'no');

            // Calculate totals (S = SUCCESS total, F = FAILURE total)
            const S = yesBets.reduce((sum: number, bet: any) => sum + bet.amount, 0);
            const F = noBets.reduce((sum: number, bet: any) => sum + bet.amount, 0);

            // Creator bonus rate (configurable)
            const r = CHALLENGE_CONFIG.CREATOR_BONUS_RATE || 0.1;

            // Determine outcome, losing pool, winners, and winner total
            const outcome = isCompleted ? 'SUCCESS' : 'FAILURE';
            let losingPool: number;
            let winners: any[];
            let W_total: number;

            if (outcome === 'SUCCESS') {
                losingPool = F;
                winners = yesBets;
                W_total = S;
            } else {
                losingPool = S;
                winners = noBets;
                W_total = F;
            }

            console.log(`Payout calculation details:`, {
                outcome,
                S,
                F,
                losingPool,
                W_total,
                winnersCount: winners.length,
                challengeId: challenge.id
            });

            // Handle edge cases: void and refund if no bets on one side or no winners
            if (W_total === 0 || losingPool === 0) {
                console.log('Voiding challenge - no bets on one side or no winners');

                // Refund all bets
                const allBets = [...yesBets, ...noBets];
                for (const bet of allBets) {
                    try {
                        await creditService.addCredits(
                            bet.user_id,
                            bet.amount,
                            'payout',
                            'Challenge voided - refund',
                            challenge.id
                        );
                        console.log(`Refunded ${bet.amount} credits to user ${bet.user_id}`);
                    } catch (refundError) {
                        console.error(`Error refunding bet for user ${bet.user_id}:`, refundError);
                    }
                }
                return;
            }

            // Check if creator is on the winning side
            const creatorBet = winners.find((bet: any) => bet.user_id === challenge.creator_id);
            const isCreatorOnWinningSide = !!creatorBet;

            // Calculate creator bonus (only if creator is on winning side)
            const creatorBonus = isCreatorOnWinningSide ? Math.floor(r * losingPool) : 0;

            // Calculate distributable pool to winners
            const poolToWinners = losingPool - creatorBonus;

            // Distribute payouts to winners
            for (const bet of winners) {
                try {
                    const w_i = bet.amount;
                    const proportionalShare = (w_i / W_total) * poolToWinners;
                    const payout = Math.floor(w_i + proportionalShare);

                    await creditService.addCredits(
                        bet.user_id,
                        payout,
                        'payout',
                        'Winning bet payout',
                        challenge.id
                    );
                    console.log(`Paid out ${payout} credits to winner ${bet.user_id}`);
                } catch (payoutError) {
                    console.error(`Error paying out winner ${bet.user_id}:`, payoutError);
                }
            }

            // Give creator bonus separately (if applicable)
            if (creatorBonus > 0) {
                try {
                    await creditService.addCredits(
                        challenge.creator_id,
                        creatorBonus,
                        'payout',
                        'Challenge creator bonus',
                        challenge.id
                    );
                    console.log(`Paid creator bonus of ${creatorBonus} credits to ${challenge.creator_id}`);
                } catch (bonusError) {
                    console.error(`Error paying creator bonus:`, bonusError);
                }
            }

            console.log(`Payout calculation completed for challenge ${challenge.id}`);
        } catch (error) {
            console.error(`Error in calculatePayouts for challenge ${challenge.id}:`, error);
            throw error;
        }
    }

    private async updateChallengeStatuses(groupId?: string): Promise<void> {
        try {
            const now = new Date();

            // Get challenges that might need status updates
            let query = supabase
                .from('challenges')
                .select('id, status, deadline, proof_image_url, voting_ends_at, proof_submitted_at');

            if (groupId) {
                query = query.eq('group_id', groupId);
            }

            const { data: challenges, error } = await query
                .in('status', ['active', 'voting'])
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching challenges for status update:', error);
                return;
            }

            console.log(`Checking ${challenges?.length || 0} challenges for status updates`);

            for (const challenge of challenges || []) {
                try {
                    const deadline = new Date(challenge.deadline);
                    const proofDeadline = new Date(deadline.getTime() + CHALLENGE_CONFIG.PROOF_SUBMISSION_HOURS * 60 * 60 * 1000);

                    // Handle active challenges that have passed their deadline
                    if (challenge.status === 'active' && now > deadline) {
                        // If proof deadline has also passed and no proof submitted, mark as failed
                        if (now > proofDeadline && !challenge.proof_image_url) {
                            console.log(`Marking challenge ${challenge.id} as failed - no proof submitted`);
                            await supabase
                                .from('challenges')
                                .update({
                                    status: 'completed',
                                    is_completed: false,
                                    updated_at: new Date().toISOString(),
                                })
                                .eq('id', challenge.id);
                        }
                        // If deadline passed but still within proof window, don't change status yet
                        // The status will be updated when proof is submitted or proof deadline passes
                    }

                    // Handle voting challenges where voting period has ended
                    if (challenge.status === 'voting' && challenge.voting_ends_at) {
                        const votingEnd = new Date(challenge.voting_ends_at);
                        if (now > votingEnd) {
                            console.log(`Finalizing challenge ${challenge.id} - voting period ended`);
                            // Finalize the challenge based on votes
                            await this.finalizeChallenge(challenge.id);
                        }
                    }
                } catch (challengeError) {
                    console.error(`Error updating status for challenge ${challenge.id}:`, challengeError);
                    // Continue with other challenges even if one fails
                }
            }
        } catch (error) {
            console.error('Error in updateChallengeStatuses:', error);
        }
    }

    async getActiveChallenges(groupId?: string, isGlobal = false): Promise<Challenge[]> {
        // Update challenge statuses first
        await this.updateChallengeStatuses(groupId);

        let query = supabase
            .from('challenges')
            .select('*')
            .eq('status', 'active')
            .gt('deadline', new Date().toISOString());

        if (isGlobal) {
            query = query.eq('is_global', true);
        } else if (groupId) {
            query = query.eq('group_id', groupId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Map database fields to TypeScript interface
        const mappedData = (data || []).map(challenge => ({
            id: challenge.id,
            creatorId: challenge.creator_id,
            title: challenge.title,
            description: challenge.description,
            minimumBet: challenge.minimum_bet,
            deadline: challenge.deadline,
            isGlobal: challenge.is_global,
            groupId: challenge.group_id,
            status: challenge.status,
            proofImageUrl: challenge.proof_image_url,
            proofSubmittedAt: challenge.proof_submitted_at,
            votingEndsAt: challenge.voting_ends_at,
            totalYesBets: challenge.total_yes_bets,
            totalNoBets: challenge.total_no_bets,
            totalCreditsPool: challenge.total_credits_pool,
            isCompleted: challenge.is_completed,
            completionVotes: challenge.completion_votes,
            createdAt: challenge.created_at,
            updatedAt: challenge.updated_at
        }));

        return mappedData;
    }
    async refreshChallengeStatus(challengeId: string): Promise<void> {
        try {
            const { data: challenge, error } = await supabase
                .from('challenges')
                .select('id, status, deadline, proof_image_url, voting_ends_at, proof_submitted_at')
                .eq('id', challengeId)
                .single();

            if (error) {
                console.error('Error fetching challenge for status refresh:', error);
                return;
            }

            const now = new Date();
            const deadline = new Date(challenge.deadline);
            const proofDeadline = new Date(deadline.getTime() + CHALLENGE_CONFIG.PROOF_SUBMISSION_HOURS * 60 * 60 * 1000);

            // Handle active challenges that have passed their deadline
            if (challenge.status === 'active' && now > deadline) {
                // If proof deadline has also passed and no proof submitted, mark as failed
                if (now > proofDeadline && !challenge.proof_image_url) {
                    console.log(`Refreshing challenge ${challengeId} - marking as failed`);
                    await supabase
                        .from('challenges')
                        .update({
                            status: 'completed',
                            is_completed: false,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', challenge.id);
                }
            }

            // Handle voting challenges where voting period has ended
            if (challenge.status === 'voting' && challenge.voting_ends_at) {
                const votingEnd = new Date(challenge.voting_ends_at);
                if (now > votingEnd) {
                    console.log(`Refreshing challenge ${challengeId} - finalizing voting`);
                    await this.finalizeChallenge(challenge.id);
                }
            }
        } catch (error) {
            console.error(`Error refreshing challenge status for ${challengeId}:`, error);
        }
    }

    // Method to fix stuck challenges that should be completed but aren't
    async fixStuckChallenges(): Promise<void> {
        try {
            console.log('Checking for stuck challenges...');
            const now = new Date();

            // Find challenges that are stuck in voting status past their voting deadline
            const { data: stuckChallenges, error } = await supabase
                .from('challenges')
                .select('id, status, voting_ends_at, deadline')
                .eq('status', 'voting')
                .lt('voting_ends_at', now.toISOString());

            if (error) {
                console.error('Error finding stuck challenges:', error);
                return;
            }

            console.log(`Found ${stuckChallenges?.length || 0} stuck challenges`);

            for (const challenge of stuckChallenges || []) {
                console.log(`Fixing stuck challenge ${challenge.id}`);
                await this.finalizeChallenge(challenge.id);
            }

            // Also find active challenges that should have failed
            const { data: expiredChallenges, error: expiredError } = await supabase
                .from('challenges')
                .select('id, status, deadline, proof_image_url')
                .eq('status', 'active')
                .lt('deadline', new Date(now.getTime() - CHALLENGE_CONFIG.PROOF_SUBMISSION_HOURS * 60 * 60 * 1000).toISOString());

            if (expiredError) {
                console.error('Error finding expired challenges:', expiredError);
                return;
            }

            console.log(`Found ${expiredChallenges?.length || 0} expired challenges`);

            for (const challenge of expiredChallenges || []) {
                if (!challenge.proof_image_url) {
                    console.log(`Marking expired challenge ${challenge.id} as failed`);
                    await supabase
                        .from('challenges')
                        .update({
                            status: 'completed',
                            is_completed: false,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', challenge.id);
                }
            }
        } catch (error) {
            console.error('Error fixing stuck challenges:', error);
        }
    }
}

export const challengeService = new ChallengeService();