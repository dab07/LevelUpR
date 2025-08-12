import { supabase } from '@/lib/supabase';
import { Challenge, Bet } from '@/types';
import { creditService } from './creditService';
import { getCurrentUserId } from '@/lib/supabase';

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
        const proofDeadline = new Date(deadline.getTime() + 3 * 60 * 60 * 1000); // 3 hours after deadline

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
                voting_ends_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
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

        if (challengeError) throw challengeError;

        // Count votes
        const yesVotes = challenge.completion_votes.filter((v: any) => v.vote === 'yes').length;
        const noVotes = challenge.completion_votes.filter((v: any) => v.vote === 'no').length;
        const isCompleted = yesVotes > noVotes;

        // Calculate payouts
        await this.calculatePayouts(challenge, isCompleted);

        // Update challenge status
        await supabase
            .from('challenges')
            .update({
                status: 'completed',
                is_completed: isCompleted,
                completion_votes: { yes: yesVotes, no: noVotes },
            })
            .eq('id', challengeId);
    }

    private async calculatePayouts(challenge: any, isCompleted: boolean): Promise<void> {
        const yesBets = challenge.bets.filter((b: any) => b.bet_type === 'yes');
        const noBets = challenge.bets.filter((b: any) => b.bet_type === 'no');

        const totalYesAmount = yesBets.reduce((sum: number, bet: any) => sum + bet.amount, 0);
        const totalNoAmount = noBets.reduce((sum: number, bet: any) => sum + bet.amount, 0);

        if (isCompleted) {
            // Creator gets their bet back + 50% of "No" votes
            const creatorBonus = totalNoAmount * 0.5;
            await creditService.addCredits(
                challenge.creator_id,
                creatorBonus,
                'payout',
                'Challenge completion bonus',
                challenge.id
            );

            // "Yes" voters split the remaining 50% of "No" votes proportionally
            const yesPayoutPool = totalNoAmount * 0.5;
            for (const bet of yesBets) {
                const proportion = bet.amount / totalYesAmount;
                const payout = bet.amount + (yesPayoutPool * proportion);

                await creditService.addCredits(
                    bet.user_id,
                    payout,
                    'payout',
                    'Winning bet payout',
                    challenge.id
                );
            }
        } else {
            // "No" voters get refunds + all "Yes" vote credits proportionally
            for (const bet of noBets) {
                const proportion = bet.amount / totalNoAmount;
                const payout = bet.amount + (totalYesAmount * proportion);

                await creditService.addCredits(
                    bet.user_id,
                    payout,
                    'payout',
                    'Winning bet payout',
                    challenge.id
                );
            }
        }
    }

    async getActiveChallenges(groupId?: string, isGlobal = false): Promise<Challenge[]> {
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
}

export const challengeService = new ChallengeService();