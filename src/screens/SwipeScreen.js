import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Image,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Text,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Video } from 'expo-av';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    runOnJS,
    useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export function SwipeScreen() {
    const [mediaAssets, setMediaAssets] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [permission, setPermission] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [toDeleteAssets, setToDeleteAssets] = useState([]);
    const [actionHistory, setActionHistory] = useState([]); // [{index: number, action: string, asset: object}]
    const videoRef = useRef(null);

    const translateX = useSharedValue(0);

    useEffect(() => {
        (async () => {
            try {
                const { status } = await MediaLibrary.requestPermissionsAsync();
                console.log('Permission status:', status);
                setPermission(status === 'granted');

                if (status === 'granted') {
                    const media = await MediaLibrary.getAssetsAsync({
                        first: 50,
                        sortBy: [MediaLibrary.SortBy.creationTime],
                        mediaType: [
                            MediaLibrary.MediaType.photo,
                            MediaLibrary.MediaType.video,
                        ],
                    });

                    console.log('Found media assets:', media.assets.length);
                    console.log('Total count:', media.totalCount);

                    if (media.assets.length > 0) {
                        console.log(
                            'First asset type:',
                            media.assets[0].mediaType
                        );
                    }

                    setMediaAssets(media.assets);
                }
            } catch (error) {
                console.error('Error accessing media library:', error);
            }
        })();
    }, []);

    const handleSwipeComplete = async (direction) => {
        if (videoRef.current) {
            await videoRef.current.stopAsync();
            setIsPlaying(false);
        }

        const action = direction === 'right' ? 'keep' : 'delete';
        handleAction(action);
    };

    const handleAction = (action) => {
        const currentAsset = mediaAssets[currentIndex];

        // Record the action in history
        setActionHistory((prev) => [
            ...prev,
            {
                index: currentIndex,
                action,
                asset: currentAsset,
            },
        ]);

        // Handle specific actions
        if (action === 'delete') {
            setToDeleteAssets((prev) => [...prev, currentAsset]);
        }

        // Move to next item if not at the end
        if (currentIndex < mediaAssets.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
        translateX.value = 0;
    };

    const skipCurrent = () => {
        handleAction('skip');
    };

    const undoLastAction = () => {
        if (actionHistory.length > 0) {
            const lastAction = actionHistory[actionHistory.length - 1];

            // Remove the last action from history
            setActionHistory((prev) => prev.slice(0, -1));

            // If it was a delete action, remove from delete list
            if (lastAction.action === 'delete') {
                setToDeleteAssets((prev) =>
                    prev.filter((asset) => asset.id !== lastAction.asset.id)
                );
            }

            // Go back to the previous index
            setCurrentIndex(lastAction.index);
        }
    };

    const proceedToDelete = async () => {
        console.log('Assets marked for deletion:', toDeleteAssets.length);
        // Here you would implement the actual deletion logic
        // For now, we'll just log the assets
        toDeleteAssets.forEach((asset) => {
            console.log('Will delete:', asset.uri);
        });
    };

    const togglePlayPause = async () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            await videoRef.current.pauseAsync();
        } else {
            await videoRef.current.playAsync();
        }
        setIsPlaying(!isPlaying);
    };

    const gestureHandler = useAnimatedGestureHandler({
        onStart: () => {
            translateX.value = 0;
        },
        onActive: (event) => {
            translateX.value = event.translationX;
        },
        onEnd: (event) => {
            if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
                translateX.value = withSpring(
                    event.translationX > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH,
                    {},
                    () => {
                        runOnJS(handleSwipeComplete)(
                            event.translationX > 0 ? 'right' : 'left'
                        );
                    }
                );
            } else {
                translateX.value = withSpring(0);
            }
        },
    });

    const rStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    // const renderMediaItem = () => {
    //     if (!mediaAssets[currentIndex]) return null;

    //     const asset = mediaAssets[currentIndex];
    //     const isVideo = asset.mediaType === 'video';

    //     if (isVideo) {
    //         return (
    //             <View style={styles.mediaContainer}>
    //                 <Video
    //                     ref={videoRef}
    //                     source={{ uri: asset.uri }}
    //                     style={styles.video}
    //                     resizeMode="contain"
    //                     isLooping
    //                     onPlaybackStatusUpdate={(status) =>
    //                         setIsPlaying(status.isPlaying)
    //                     }
    //                 />
    //                 <TouchableOpacity
    //                     style={styles.playButton}
    //                     onPress={togglePlayPause}
    //                 >
    //                     <MaterialIcons
    //                         name={isPlaying ? 'pause' : 'play-arrow'}
    //                         size={40}
    //                         color="white"
    //                     />
    //                 </TouchableOpacity>
    //             </View>
    //         );
    //     }

    //     return (
    //         <Image
    //             source={{ uri: asset.uri }}
    //             style={styles.image}
    //             resizeMode="cover"
    //         />
    //     );
    // };
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));
    const renderMediaItem = () => {
        const currentAsset = mediaAssets[currentIndex];
        const previousAsset = mediaAssets[currentIndex - 1] || null;
        const nextAsset = mediaAssets[currentIndex + 1] || null;

        return (
            <View style={styles.mediaContainer}>
                {previousAsset && (
                    <Image
                        source={{ uri: previousAsset.uri }}
                        style={[styles.image, styles.previousImage]}
                        resizeMode="cover"
                    />
                )}
                {currentAsset && (
                    <Animated.View
                        style={[styles.imageContainer, animatedStyle]}
                    >
                        <Image
                            source={{ uri: currentAsset.uri }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    </Animated.View>
                )}
                {nextAsset && (
                    <Image
                        source={{ uri: nextAsset.uri }}
                        style={[styles.image, styles.nextImage]}
                        resizeMode="cover"
                    />
                )}
            </View>
        );
    };

    if (!permission) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>
                    Please grant media library permissions to use this feature.
                </Text>
            </View>
        );
    }

    if (mediaAssets.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>
                    No media found in your gallery.
                </Text>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <View style={styles.container}>
                <View style={styles.header}>
                    {actionHistory.length > 0 && (
                        <TouchableOpacity
                            style={styles.undoButton}
                            onPress={undoLastAction}
                        >
                            <MaterialIcons
                                name="undo"
                                size={24}
                                color="white"
                            />
                            <Text style={styles.undoButtonText}>
                                Undo{' '}
                                {
                                    actionHistory[actionHistory.length - 1]
                                        ?.action
                                }
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <PanGestureHandler onGestureEvent={gestureHandler}>
                    <Animated.View style={[styles.imageContainer, rStyle]}>
                        {renderMediaItem()}
                    </Animated.View>
                </PanGestureHandler>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.deleteButton]}
                        onPress={() => handleAction('delete')}
                    >
                        <Text style={styles.buttonText}>Delete</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.skipButton]}
                        onPress={skipCurrent}
                    >
                        <Text style={styles.buttonText}>Skip</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.keepButton]}
                        onPress={() => handleAction('keep')}
                    >
                        <Text style={styles.buttonText}>Keep</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[
                        styles.proceedButton,
                        { opacity: toDeleteAssets.length > 0 ? 1 : 0.5 },
                    ]}
                    onPress={proceedToDelete}
                    disabled={toDeleteAssets.length === 0}
                >
                    <Text style={styles.buttonText}>
                        Proceed to Delete ({toDeleteAssets.length})
                    </Text>
                </TouchableOpacity>

                <Text style={styles.counter}>
                    {currentIndex + 1} / {mediaAssets.length}
                </Text>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        zIndex: 2,
    },
    undoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    undoButtonText: {
        color: 'white',
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '500',
    },
    imageContainer: {
        flex: 1,
        width: SCREEN_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaContainer: {
        flex: 1,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    image: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        resizeMode: 'cover',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    playButton: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 30,
        padding: 10,
        zIndex: 2,
    },
    previousImage: {
        position: 'absolute',
        left: -SCREEN_WIDTH, // Position off-screen to the left
    },
    nextImage: {
        position: 'absolute',
        right: -SCREEN_WIDTH, // Position off-screen to the right
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 40,
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 20,
        zIndex: 2,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        minWidth: 100,
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        backdropFilter: 'blur(10px)',
    },
    deleteButton: {
        backgroundColor: 'rgba(255, 69, 58, 0.6)',
    },
    skipButton: {
        backgroundColor: 'rgba(255, 184, 0, 0.6)',
    },
    keepButton: {
        backgroundColor: 'rgba(48, 209, 88, 0.6)',
    },
    proceedButton: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
        backgroundColor: 'rgba(0, 122, 255, 0.6)',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        minWidth: 200,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        zIndex: 2,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    counter: {
        position: 'absolute',
        bottom: 150,
        alignSelf: 'center',
        fontSize: 16,
        color: 'white',
        fontWeight: '500',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 12,
        zIndex: 2,
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        padding: 20,
    },
});
