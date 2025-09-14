import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className="flex-1 items-center justify-center p-5">
        <Text className="text-xl font-semibold">Guess who just lost 99999 Aura..LOL.</Text>
        <Link href="/" className="mt-4 py-4">
          <Text>Go back to Kitchen!</Text>
        </Link>
      </View>
    </>
  );
}

