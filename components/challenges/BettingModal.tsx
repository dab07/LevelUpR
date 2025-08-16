import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
      loadCurrentUser();
      determineCurrentPhase();
      checkUserVotingStatus();
    }
  }, [visible, challenge]);

  // Sync with parent credits
  useEffect(() => {
    if (parentUserCredits !== undefined) {
      setUserCredits(parentUserCredits);
    }
  }, [parentUserCredits]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      resetModalState();
    }
  }, [visible]);

  const resetModalState = () => {
    setBetType('yes');
    setBetAmount('');
    setVotingData({ photos: [], description: '' });
    setUploadProgress(0);
    setHasVoted(false);
  };

  const loadUserCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const credits = await creditService.getUserCredits(user.id);
        setUserCredits(credits);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading user credits:', error);
      setUserCredits(0);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const determineCurrentPhase = (): ChallengePhase => {
    if (!safeChallenge) return 'betting';

    const now = new Date();
    const deadline = new Date(safeChallenge.deadline);
    const proofDeadline = new Date(deadline.getTime() + CHALLENGE_CONFIG.PROOF_SUBMISSION_HOURS * 60 * 60 * 1000);

    if (safeChallenge.status === 'completed') {
      setCurrentPhase('completed');
      return 'completed';
    }

    if (safeChallenge.status === 'voting') {
      setCurrentPhase('verification');
      return 'verification';
    }

    if (now < deadline) {
      setCurrentPhase('betting');
      return 'betting';
    }

    if (now >= deadline && now < proofDeadline) {
      if (safeChallenge.proofImageUrl) {
        setCurrentPhase('verification');
        return 'verification';
      } else {
        setCurrentPhase('proof_submission');
        return 'proof_submission';
      }
    }

    // Past proof deadline - should be auto-failed
    setCurrentPhase('completed');
    return 'completed';
  };

  const checkUserVotingStatus = async () => {
    if (!safeChallenge || !currentUser) return;

    try {
      const { data, error } = await supabase
        .from('completion_votes')
        .select('id')
        .eq('challenge_id', safeChallenge.id)
        .eq('user_id', currentUser.id)
        .single();

      setHasVoted(!!data);
    } catch (error) {
      // No vote found, which is fine
      setHasVoted(false);
    }
  };

  const getTimeUntilDeadline = () => {
    if (!safeChallenge) return '';

    const now = new Date();
    const deadline = new Date(safeChallenge.deadline);
    const diff = deadline.getTime() - now.getTime();

    if (diff < 0) return 'Deadline passed';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getTimeUntilProofDeadline = () => {
    if (!safeChallenge) return '';

    const deadline = new Date(safeChallenge.deadline);
    const proofDeadline = new Date(deadline.getTime() + 3 * 60 * 60 * 1000);
    const now = new Date();
    const diff = proofDeadline.getTime() - now.getTime();

    if (diff < 0) return 'Proof deadline passed';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m to submit proof`;
  };

  const canSubmitProof = () => {
    if (!safeChallenge || !isCreator) return false;

    const now = new Date();
    const deadline = new Date(safeChallenge.deadline);
    const proofDeadline = new Date(deadline.getTime() + 3 * 60 * 60 * 1000);

    // Can only submit proof after deadline but before proof deadline
    return now >= deadline && now < proofDeadline && !safeChallenge.proofImageUrl;
  };

  const canPlaceBet = () => {
    if (!safeChallenge || userBet) return false;

    const now = new Date();
    const deadline = new Date(safeChallenge.deadline);

    // Can only bet before deadline
    return now < deadline && safeChallenge.status === 'active';
  };

  const canVote = () => {
    if (!safeChallenge || !userBet || isCreator || hasVoted) return false;

    return safeChallenge.status === 'voting' && safeChallenge.proofImageUrl;
  };

  const calculatePotentialPayout = () => {
    if (!safeChallenge) return 0;

    const amount = parseInt(betAmount) || 0;
    if (amount === 0) return 0;

    // Current totals
    const currentYes = safeChallenge.totalYesBets;
    const currentNo = safeChallenge.totalNoBets;

    // Calculate new totals including this bet
    const S = betType === 'yes' ? currentYes + amount : currentYes;
    const F = betType === 'no' ? currentNo + amount : currentNo;

    // Determine losing pool and winner total if this bet wins
    const losingPool = betType === 'yes' ? F : S;
    const W_total = betType === 'yes' ? S : F;

    // Handle edge cases
    if (W_total === 0 || losingPool === 0) return amount; // Refund scenario

    // Creator bonus rate
    const r = CHALLENGE_CONFIG.CREATOR_BONUS_RATE;

    // Assume user is not the creator for payout calculation
    // (Creator bonus is separate and only applies if creator is on winning side)
    const creatorBonus = 0; // Conservative estimate
    const poolToWinners = losingPool - creatorBonus;

    // Calculate potential payout for this bet
    const proportionalShare = (amount / W_total) * poolToWinners;
    const potentialPayout = amount + proportionalShare;

    return Math.floor(potentialPayout);
  };

  const getWinChance = () => {
    if (!safeChallenge) return 50;

    const totalBets = safeChallenge.totalYesBets + safeChallenge.totalNoBets;
    if (totalBets === 0) return 50;

    const sameBets = betType === 'yes' ? safeChallenge.totalYesBets : safeChallenge.totalNoBets;
    const opposingBets = betType === 'yes' ? safeChallenge.totalNoBets : safeChallenge.totalYesBets;

    const totalWithNewBet = totalBets + parseInt(betAmount || '0');
    const opposingPercentage = (opposingBets / totalWithNewBet) * 100;

    return Math.round(opposingPercentage);
  };

  const handlePlaceBet = async () => {
    if (!safeChallenge || !currentUser) {
      Alert.alert('Error', 'Challenge or user data is not available');
      return;
    }

    if (!canPlaceBet()) {
      Alert.alert('Error', 'Betting is no longer available for this challenge');
      return;
    }

    const amount = parseInt(betAmount);

    if (isNaN(amount) || amount < safeChallenge.minimumBet) {
      Alert.alert('Error', `Minimum bet is ${safeChallenge.minimumBet} credits`);
      return;
    }

    if (amount > userCredits) {
      Alert.alert('Error', 'Insufficient credits');
      return;
    }

    setLoading(true);
    try {
      await challengeService.placeBet(currentUser.id, safeChallenge.id, betType, amount);

      // Refresh user credits
      const newCredits = await creditService.getUserCredits(currentUser.id);
      setUserCredits(newCredits);

      Alert.alert(
        'Bet Placed!',
        `You bet ${amount} credits on "${betType.toUpperCase()}" for this challenge.`,
        [{
          text: 'OK', onPress: () => {
            onBetPlaced();
            onClose();
          }
        }]
      );
    } catch (error: any) {
      console.error('Error placing bet:', error);
      Alert.alert('Error', error.message || 'Failed to place bet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos.');
      return false;
    }
    return true;
  };

  const pickImages = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (votingData.photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 5 photos.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5 - votingData.photos.length,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets) {
        const newPhotos: PhotoSubmission[] = [];

        for (const asset of result.assets) {
          if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
            Alert.alert('File Too Large', 'Please select images smaller than 5MB.');
            continue;
          }

          const manipulatedImage = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 800, height: 600 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );

          const photo: PhotoSubmission = {
            id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            uri: manipulatedImage.uri,
            type: 'image/jpeg',
            name: `proof_${Date.now()}.jpg`,
            size: asset.fileSize
          };

          newPhotos.push(photo);
        }

        setVotingData(prev => ({
          ...prev,
          photos: [...prev.photos, ...newPhotos]
        }));
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to select images. Please try again.');
    }
  };

  const removePhoto = (photoId: string) => {
    setVotingData(prev => ({
      ...prev,
      photos: prev.photos.filter(photo => photo.id !== photoId)
    }));
  };

  const uploadPhotosAndSubmitProof = async () => {
    if (!safeChallenge || !currentUser) {
      Alert.alert('Error', 'Challenge or user data is not available');
      return;
    }

    if (!canSubmitProof()) {
      Alert.alert('Error', 'Proof submission is not available at this time');
      return;
    }

    if (votingData.photos.length === 0) {
      Alert.alert('Error', 'Please upload at least one photo as proof.');
      return;
    }

    setUploadingPhotos(true);
    setUploadProgress(0);

    try {
      console.log('Starting photo upload process...');
      console.log('Number of photos to upload:', votingData.photos.length);

      // Verify authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }
      console.log('User authenticated, proceeding with upload');

      const uploadedUrls: string[] = [];

      for (let i = 0; i < votingData.photos.length; i++) {
        const photo = votingData.photos[i];
        setUploadProgress(((i + 1) / votingData.photos.length) * 100);

        const fileName = `${currentUser.id}/${safeChallenge.id}/${Date.now()}_${i + 1}.jpg`;

        try {
          console.log(`Uploading photo ${i + 1}/${votingData.photos.length}`);
          console.log('Photo details:', { uri: photo.uri, type: photo.type, name: photo.name });

          // For React Native, we need to handle file uploads differently
          const response = await fetch(photo.uri);

          if (!response.ok) {
            throw new Error(`Failed to read image file: ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          console.log('File size after conversion:', uint8Array.length, 'bytes');

          if (uint8Array.length === 0) {
            throw new Error('Image file is empty');
          }

          console.log('Uploading to Supabase with filename:', fileName);

          const { data, error } = await supabase.storage
            .from('challenge_proofs')
            .upload(fileName, uint8Array, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (error) {
            console.error('Supabase upload error:', error);
            throw error;
          }

          console.log('Upload successful, data:', data);

          const { data: { publicUrl } } = supabase.storage
            .from('challenge_proofs')
            .getPublicUrl(data.path);

          console.log('Generated public URL:', publicUrl);
          uploadedUrls.push(publicUrl);
        } catch (uploadError) {
          console.error(`Error uploading photo ${i + 1}:`, uploadError);
          throw new Error(`Failed to upload photo ${i + 1}: ${uploadError.message}`);
        }
      }

      // Submit proof with uploaded URLs and description
      await challengeService.submitProof(safeChallenge.id, uploadedUrls[0], votingData.description);

      Alert.alert(
        'Proof Submitted!',
        'Your proof has been uploaded successfully. The verification period has started.',
        [{
          text: 'OK', onPress: () => {
            onBetPlaced();
            onClose();
          }
        }]
      );

    } catch (error) {
      console.error('Error uploading photos:', error);
      Alert.alert('Upload Failed', 'Failed to upload photos. Please try again.');
    } finally {
      setUploadingPhotos(false);
      setUploadProgress(0);
    }
  };

  const handleVote = async (vote: 'yes' | 'no') => {
    if (!safeChallenge || !currentUser) {
      Alert.alert('Error', 'Challenge or user data is not available');
      return;
    }

    if (!canVote()) {
      Alert.alert('Error', 'You cannot vote on this challenge');
      return;
    }

    setVotingLoading(true);
    try {
      await challengeService.voteOnCompletion(safeChallenge.id, vote);
      setHasVoted(true);

      Alert.alert(
        'Vote Submitted!',
        `You voted "${vote.toUpperCase()}" on this challenge completion.`,
        [{
          text: 'OK', onPress: () => {
            onBetPlaced();
            onClose();
          }
        }]
      );
    } catch (error: any) {
      console.error('Error voting:', error);
      Alert.alert('Error', error.message || 'Failed to submit vote.');
    } finally {
      setVotingLoading(false);
    }
  };

  const getPhaseTitle = () => {
    switch (currentPhase) {
      case 'betting':
        return 'Place Your Bet';
      case 'waiting_for_proof':
        return 'Waiting for Proof';
      case 'proof_submission':
        return 'Submit Proof';
      case 'verification':
        return 'Vote on Completion';
      case 'completed':
        return 'Challenge Completed';
      default:
        return 'Challenge';
    }
  };

  const getPhaseDescription = () => {
    switch (currentPhase) {
      case 'betting':
        return `Betting closes in ${getTimeUntilDeadline()}`;
      case 'waiting_for_proof':
        return 'Waiting for creator to submit proof of completion';
      case 'proof_submission':
        return `${getTimeUntilProofDeadline()}`;
      case 'verification':
        return 'Group members are voting on proof validity';
      case 'completed':
        return safeChallenge?.isCompleted ? 'Challenge was completed successfully' : 'Challenge failed';
      default:
        return '';
    }
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>{getPhaseTitle()}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Challenge Info */}
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeTitle} numberOfLines={2}>
              {safeChallenge.title}
            </Text>
            <Text style={styles.challengeDescription} numberOfLines={3}>
              {safeChallenge.description}
            </Text>

            <View style={styles.phaseIndicator}>
              <Clock size={16} color="#8B5CF6" />
              <Text style={styles.phaseText}>{getPhaseDescription()}</Text>
            </View>
          </View>

          {/* Credits Display */}
          <View style={styles.creditsInfo}>
            <Coins size={20} color="#F59E0B" />
            <Text style={styles.creditsText}>
              Available Credits: {userCredits}
            </Text>
          </View>

          {/* Betting Phase */}
          {currentPhase === 'betting' && canPlaceBet() && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Choose Your Prediction</Text>
                <View style={styles.betTypeContainer}>
                  <TouchableOpacity
                    onPress={() => setBetType('yes')}
                    style={[
                      styles.betTypeButton,
                      styles.yesButton,
                      betType === 'yes' && styles.selectedBetType
                    ]}
                  >
                    <CheckCircle size={20} color="#FFFFFF" />
                    <Text style={styles.betTypeText}>SUCCESS</Text>
                    <Text style={styles.betTypeSubtext}>Will complete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setBetType('no')}
                    style={[
                      styles.betTypeButton,
                      styles.noButton,
                      betType === 'no' && styles.selectedBetType
                    ]}
                  >
                    <XCircle size={20} color="#FFFFFF" />
                    <Text style={styles.betTypeText}>FAILURE</Text>
                    <Text style={styles.betTypeSubtext}>Will fail</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bet Amount</Text>
                <View style={styles.amountContainer}>
                  <Coins size={20} color="#F59E0B" style={styles.amountIcon} />
                  <TextInput
                    style={styles.amountInput}
                    value={betAmount}
                    onChangeText={setBetAmount}
                    keyboardType="numeric"
                    placeholder={safeChallenge.minimumBet.toString()}
                  />
                  <Text style={styles.creditsLabel}>credits</Text>
                </View>
                <Text style={styles.helperText}>
                  Minimum: {safeChallenge.minimumBet} credits
                </Text>
              </View>

              <View style={styles.calculationCard}>
                <View style={styles.calculationHeader}>
                  <TrendingUp size={20} color="#8B5CF6" />
                  <Text style={styles.calculationTitle}>Potential Payout</Text>
                </View>

                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>Your bet:</Text>
                  <Text style={styles.calculationValue}>{betAmount || 0} credits</Text>
                </View>

                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>Potential win:</Text>
                  <Text style={[styles.calculationValue, styles.winAmount]}>
                    {calculatePotentialPayout()} credits
                  </Text>
                </View>

                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>Win chance:</Text>
                  <Text style={styles.calculationValue}>{getWinChance()}%</Text>
                </View>
              </View>
            </>
          )}

          {/* Proof Submission Phase */}
          {currentPhase === 'proof_submission' && isCreator && canSubmitProof() && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upload Proof Photos (1-5 images)</Text>

                <TouchableOpacity
                  onPress={pickImages}
                  style={styles.uploadButton}
                  disabled={votingData.photos.length >= 5}
                >
                  <Camera size={24} color="#8B5CF6" />
                  <Text style={styles.uploadButtonText}>
                    {votingData.photos.length === 0 ? 'Select Photos' : 'Add More Photos'}
                  </Text>
                  <Text style={styles.uploadButtonSubtext}>
                    {votingData.photos.length}/5 photos selected
                  </Text>
                </TouchableOpacity>

                {votingData.photos.length > 0 && (
                  <ScrollView horizontal style={styles.photoPreview} showsHorizontalScrollIndicator={false}>
                    {votingData.photos.map((photo) => (
                      <View key={photo.id} style={styles.photoContainer}>
                        <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                        <TouchableOpacity
                          onPress={() => removePhoto(photo.id)}
                          style={styles.removePhotoButton}
                        >
                          <Trash2 size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description (Optional)</Text>
                <TextInput
                  style={styles.descriptionInput}
                  value={votingData.description}
                  onChangeText={(text) => setVotingData(prev => ({ ...prev, description: text }))}
                  placeholder="Add any additional details about your completion..."
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              </View>

              {uploadingPhotos && (
                <View style={styles.uploadProgress}>
                  <Text style={styles.uploadProgressText}>
                    Uploading photos... {Math.round(uploadProgress)}%
                  </Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                  </View>
                </View>
              )}
            </>
          )}

          {/* Verification Phase */}
          {currentPhase === 'verification' && safeChallenge.proofImageUrl && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Submitted Proof</Text>
                <Image source={{ uri: safeChallenge.proofImageUrl }} style={styles.proofImage} />

                {safeChallenge.votingEndsAt && (
                  <View style={styles.votingTimer}>
                    <Vote size={16} color="#F59E0B" />
                    <Text style={styles.votingTimerText}>
                      Voting ends: {new Date(safeChallenge.votingEndsAt).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              {canVote() && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Vote on Completion</Text>
                  <Text style={styles.votingDescription}>
                    Does the submitted proof show that the challenge was completed successfully?
                  </Text>

                  <View style={styles.votingButtons}>
                    <TouchableOpacity
                      onPress={() => handleVote('yes')}
                      style={[styles.voteButton, styles.yesVoteButton]}
                      disabled={votingLoading}
                    >
                      <CheckCircle size={20} color="#FFFFFF" />
                      <Text style={styles.voteButtonText}>VALID</Text>
                      <Text style={styles.voteButtonSubtext}>Proof is valid</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleVote('no')}
                      style={[styles.voteButton, styles.noVoteButton]}
                      disabled={votingLoading}
                    >
                      <XCircle size={20} color="#FFFFFF" />
                      <Text style={styles.voteButtonText}>INVALID</Text>
                      <Text style={styles.voteButtonSubtext}>Proof is invalid</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {hasVoted && (
                <View style={styles.votedIndicator}>
                  <Vote size={16} color="#10B981" />
                  <Text style={styles.votedText}>You have already voted on this challenge</Text>
                </View>
              )}
            </>
          )}

          {/* Current Pool Display */}
          {(safeChallenge.totalYesBets > 0 || safeChallenge.totalNoBets > 0) && (
            <View style={styles.currentPool}>
              <Text style={styles.poolTitle}>
                Current Pool: {safeChallenge.totalCreditsPool} credits
              </Text>
              <View style={styles.poolStats}>
                <View style={styles.poolStat}>
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={styles.poolStatText}>SUCCESS: {safeChallenge.totalYesBets}</Text>
                </View>
                <View style={styles.poolStat}>
                  <XCircle size={16} color="#EF4444" />
                  <Text style={styles.poolStatText}>FAILURE: {safeChallenge.totalNoBets}</Text>
                </View>
              </View>
            </View>
          )}

          {/* User Bet Display */}
          {userBet && (
            <View style={styles.userBetInfo}>
              <Text style={styles.userBetText}>
                Your bet: {userBet.amount} credits on {userBet.betType.toUpperCase()}
              </Text>
            </View>
          )}

          {/* Challenge Completed */}
          {currentPhase === 'completed' && (
            <View style={styles.completedSection}>
              <View style={[
                styles.resultCard,
                { backgroundColor: safeChallenge.isCompleted ? '#10B981' : '#EF4444' }
              ]}>
                <Text style={styles.resultTitle}>
                  {safeChallenge.isCompleted ? '🎉 Challenge Completed!' : '❌ Challenge Failed'}
                </Text>
                <Text style={styles.resultDescription}>
                  {safeChallenge.isCompleted
                    ? 'The challenge was completed successfully and verified by the group.'
                    : 'The challenge was not completed or proof was invalid.'
                  }
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          {currentPhase === 'betting' && canPlaceBet() && (
            <>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.button, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePlaceBet}
                style={[styles.button, styles.confirmButton]}
                disabled={loading || parseInt(betAmount || '0') < safeChallenge.minimumBet}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Coins size={20} color="#FFFFFF" />
                    <Text style={styles.confirmButtonText}>Place Bet</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {currentPhase === 'proof_submission' && isCreator && canSubmitProof() && (
            <>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.button, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={uploadPhotosAndSubmitProof}
                style={[styles.button, styles.confirmButton]}
                disabled={uploadingPhotos || votingData.photos.length === 0}
              >
                {uploadingPhotos ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Upload size={20} color="#FFFFFF" />
                    <Text style={styles.confirmButtonText}>Submit Proof</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {(currentPhase === 'waiting_for_proof' || currentPhase === 'verification' || currentPhase === 'completed') && (
            <TouchableOpacity
              onPress={onClose}
              style={[styles.button, styles.fullWidthButton]}
            >
              <Text style={styles.confirmButtonText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  challengeInfo: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  phaseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  phaseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginLeft: 8,
  },
  creditsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  creditsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  betTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  betTypeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  yesButton: {
    backgroundColor: '#10B981',
  },
  noButton: {
    backgroundColor: '#EF4444',
  },
  selectedBetType: {
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  betTypeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  betTypeSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  amountIcon: {
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  creditsLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  calculationCard: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  calculationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  calculationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calculationLabel: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
  },
  calculationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  winAmount: {
    color: '#10B981',
    fontSize: 16,
  },
  uploadButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
    marginTop: 8,
  },
  uploadButtonSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  photoPreview: {
    marginTop: 12,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  uploadProgress: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  uploadProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  proofImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  votingTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  votingTimerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 8,
  },
  votingDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  votingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  voteButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  yesVoteButton: {
    backgroundColor: '#10B981',
  },
  noVoteButton: {
    backgroundColor: '#EF4444',
  },
  voteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  voteButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  votedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  votedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 8,
  },
  currentPool: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  poolTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  poolStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  poolStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  poolStatText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  userBetInfo: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  userBetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
  },
  completedSection: {
    marginTop: 16,
  },
  resultCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#8B5CF6',
  },
  fullWidthButton: {
    backgroundColor: '#8B5CF6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});