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
import { X, Coins, TrendingUp, CircleCheck as CheckCircle, Circle as XCircle, Camera, Upload, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Challenge } from '@/types';
import { challengeService } from '@/services/challengeService';
import { creditService } from '@/services/creditService';
import { supabase } from '@/lib/supabase';

interface BettingModalProps {
    visible: boolean;
    onClose: () => void;
    challenge: Challenge | null;
    onBetPlaced: () => void;
    userCredits?: number; // Optional prop to pass current credits from parent
    isCreator?: boolean; // Whether the current user is the creator of the challenge
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

export default function BettingModal({ visible, onClose, challenge, onBetPlaced, userCredits: parentUserCredits, isCreator = false }: BettingModalProps) {
    // Betting state
    const [betType, setBetType] = useState<'yes' | 'no'>('yes');
    const [betAmount, setBetAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [userCredits, setUserCredits] = useState(0);

    // Voting/Photo submission state
    const [showVotingSection, setShowVotingSection] = useState(isCreator);
    const [votingData, setVotingData] = useState<VotingData>({
        photos: [],
        description: ''
    });
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Initialize betting amount when challenge changes
    useEffect(() => {
        if (visible && challenge?.minimumBet) {
            setBetAmount(challenge.minimumBet.toString());
            loadUserCredits();
            loadCurrentUser();
        }
    }, [visible, challenge]);

    // Reload credits whenever modal becomes visible to ensure fresh data
    useEffect(() => {
        if (visible) {
            loadUserCredits();
        }
    }, [visible]);

    // Sync with parent credits if provided
    useEffect(() => {
        if (parentUserCredits !== undefined) {
            setUserCredits(parentUserCredits);
            console.log('BettingModal: Synced with parent credits:', parentUserCredits);
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
        setShowVotingSection(isCreator);
        setVotingData({ photos: [], description: '' });
        setUploadProgress(0);
    };

    const loadUserCredits = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const credits = await creditService.getUserCredits(user.id);
                setUserCredits(credits);
                setCurrentUser(user);
                console.log('BettingModal: Loaded user credits:', credits);
            } else {
                console.log('BettingModal: No user found');
                setUserCredits(0);
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

    // Safe challenge property access with fallbacks
    const safeChallenge = {
        id: challenge?.id || '',
        title: challenge?.title || 'Unknown Challenge',
        description: challenge?.description || 'No description available',
        minimumBet: challenge?.minimumBet || 1,
        totalYesBets: challenge?.totalYesBets || 0,
        totalNoBets: challenge?.totalNoBets || 0,
        status: challenge?.status || 'active'
    };

    const calculatePotentialPayout = () => {
        const amount = parseInt(betAmount) || 0;
        const totalPool = safeChallenge.totalYesBets + safeChallenge.totalNoBets + amount;
        const opposingBets = betType === 'yes' ? safeChallenge.totalNoBets : safeChallenge.totalYesBets;
        const sameBets = betType === 'yes' ? safeChallenge.totalYesBets + amount : safeChallenge.totalNoBets + amount;

        if (opposingBets === 0) return amount;

        const proportion = amount / sameBets;
        const potentialWin = amount + (opposingBets * proportion);

        return Math.floor(potentialWin);
    };

    const getWinChance = () => {
        const totalBets = safeChallenge.totalYesBets + safeChallenge.totalNoBets;
        if (totalBets === 0) return 50;

        const sameBets = betType === 'yes' ? safeChallenge.totalYesBets : safeChallenge.totalNoBets;
        const opposingBets = betType === 'yes' ? safeChallenge.totalNoBets : safeChallenge.totalYesBets;

        const totalWithNewBet = totalBets + parseInt(betAmount || '0');
        const opposingPercentage = (opposingBets / totalWithNewBet) * 100;

        return Math.round(opposingPercentage);
    };

    const handlePlaceBet = async () => {
        if (!challenge) {
            Alert.alert('Error', 'Challenge data is not available');
            return;
        }

        if (!currentUser) {
            Alert.alert('Error', 'User not authenticated');
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
            await challengeService.placeBet(currentUser.id, challenge.id, betType, amount);

            // Refresh user credits after successful bet and update local state
            const newCredits = await creditService.getUserCredits(currentUser.id);
            setUserCredits(newCredits);
            console.log('BettingModal: Credits after bet placement:', newCredits);

            Alert.alert(
                'Bet Placed!',
                `You bet ${amount} credits on "${betType.toUpperCase()}" for this challenge.`,
                [{
                    text: 'OK', onPress: () => {
                        // Call onBetPlaced to refresh parent component data
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

    // Photo submission functions
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
                    // Check file size (5MB limit)
                    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
                        Alert.alert('File Too Large', 'Please select images smaller than 5MB.');
                        continue;
                    }

                    // Resize image to optimize storage
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
        if (votingData.photos.length === 0) {
            Alert.alert('Error', 'Please upload at least one photo as proof.');
            return;
        }

        if (!challenge) {
            Alert.alert('Error', 'Challenge data is not available');
            return;
        }

        setUploadingPhotos(true);
        setUploadProgress(0);

        try {
            const uploadedUrls: string[] = [];

            for (let i = 0; i < votingData.photos.length; i++) {
                const photo = votingData.photos[i];
                setUploadProgress(((i + 1) / votingData.photos.length) * 100);

                // Convert to blob for upload
                const response = await fetch(photo.uri);
                const blob = await response.blob();

                // Generate unique filename
                const fileName = `${currentUser.id}/${challenge.id}/${Date.now()}_${i + 1}.jpg`;

                // Upload to Supabase storage
                const { data, error } = await supabase.storage
                    .from('challenge_proofs')
                    .upload(fileName, blob, {
                        contentType: 'image/jpeg',
                        upsert: true,
                    });

                if (error) throw error;

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('challenge_proofs')
                    .getPublicUrl(data.path);

                uploadedUrls.push(publicUrl);
            }

            // Submit proof with uploaded URLs
            await challengeService.submitProof(challenge.id, uploadedUrls[0]); // For now, use first image

            Alert.alert(
                'Proof Submitted!',
                'Your proof has been uploaded successfully. The voting period has started.',
                [{
                    text: 'OK', onPress: () => {
                        onBetPlaced(); // Refresh challenge data
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

    // Don't render if challenge is null
    if (!challenge) {
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
                    <Text style={styles.title}>
                        {isCreator ? 'Submit Proof' : (showVotingSection ? 'Submit Proof' : 'Place Your Bet')}
                    </Text>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.challengeInfo}>
                        <Text style={styles.challengeTitle} numberOfLines={2}>
                            {safeChallenge.title}
                        </Text>
                        <Text style={styles.challengeDescription} numberOfLines={3}>
                            {safeChallenge.description}
                        </Text>
                    </View>

                    {!showVotingSection ? (
                        // Betting Section
                        <>
                            <View style={styles.creditsInfo}>
                                <Coins size={20} color="#F59E0B" />
                                <Text style={styles.creditsText}>
                                    Available Credits: {userCredits}
                                </Text>
                            </View>

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
                                        <Text style={styles.betTypeText}>YES</Text>
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
                                        <Text style={styles.betTypeText}>NO</Text>
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

                            <View style={styles.currentPool}>
                                <Text style={styles.poolTitle}>Current Pool</Text>
                                <View style={styles.poolStats}>
                                    <View style={styles.poolStat}>
                                        <CheckCircle size={16} color="#10B981" />
                                        <Text style={styles.poolStatText}>YES: {safeChallenge.totalYesBets}</Text>
                                    </View>
                                    <View style={styles.poolStat}>
                                        <XCircle size={16} color="#EF4444" />
                                        <Text style={styles.poolStatText}>NO: {safeChallenge.totalNoBets}</Text>
                                    </View>
                                </View>
                            </View>
                        </>
                    ) : (
                        // Voting/Photo Submission Section
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
                </ScrollView>

                <View style={styles.footer}>
                    {!showVotingSection ? (
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
                    ) : (
                        <>
                            <TouchableOpacity
                                onPress={() => setShowVotingSection(false)}
                                style={[styles.button, styles.cancelButton]}
                            >
                                <Text style={styles.cancelButtonText}>Back to Betting</Text>
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
                </View>

                {/* Toggle to voting section button - only for non-creators */}
                {!isCreator && !showVotingSection && safeChallenge.status === 'active' && (
                    <TouchableOpacity
                        onPress={() => setShowVotingSection(true)}
                        style={styles.toggleButton}
                    >
                        <Text style={styles.toggleButtonText}>Submit Proof Instead</Text>
                    </TouchableOpacity>
                )}
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
    toggleButton: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 8,
    },
    toggleButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B5CF6',
    },
});
