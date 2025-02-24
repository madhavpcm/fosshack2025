import { 
  View, 
  Text, 
  TouchableNativeFeedback, 
  Image, 
  ScrollView,
  Platform,
  TouchableOpacity,
  FlatList
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-media-library";
import ListItem from "react-native-flatboard/lib/components/common/ListItem";
import { useRouter } from "expo-router";
import { useEffect } from "react";

interface MediaGroup {
  title: string;
  data: Asset[];
}

interface MonthListProps {
  groupedMedia: MediaGroup[];
  mediaAssets: Asset[];
  monthToMediaCount: Record<string, number>
  setMonthToMediaCount:(prop:Record<string, number>) => void
}

const MonthList = ({ groupedMedia, mediaAssets, monthToMediaCount ,setMonthToMediaCount }: MonthListProps) => {
  
useEffect(() => {
const localMonthToMediaCount: Record<string, number> = {}
  groupedMedia.forEach((item)=> {
    localMonthToMediaCount[item.title] = item.data.length

  })
  setMonthToMediaCount(localMonthToMediaCount)
}, [])

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between items-center px-4 py-2">
        <Text className="text-2xl font-bold">Your Media</Text>
        <TouchableOpacity className="p-2">
          <Ionicons name="filter-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={groupedMedia}
        keyExtractor={(item) => item.title}
        renderItem={({ item }) => {
          return (
          <MonthListItem
            title={item.title}
            mediaCount={monthToMediaCount[item.title]}
            mediaAssets={mediaAssets}
          />
        )}}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
      />
    </View>
  );
};

export default MonthList;

const MonthListItem = ({ title, mediaCount, mediaAssets }: { title: string, mediaCount: number, mediaAssets: Asset[] }) => {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: "/swipe",
      params: {
        month: title,
        
      }
    });
  };

  return (
    <TouchableNativeFeedback
      background={TouchableNativeFeedback.Ripple('#00000010', false)}
      useForeground
      onPress={handlePress}
    >
      <View
      className="bg-white flex gap-4 flex-row items-center border-b border-gray-200 py-2"
      >
        <View
        className="p-3 bg-green-200 flex items-center  justify-center rounded-full"
        >

    
        <Ionicons
        name="folder"
        size={24}
        color={"#60a512"}
        />
        </View>
        <View>
        <Text
className="font-semibold"
>

 {title}
</Text>
<Text
className="text-sm font-light text-muted-foreground"
>
  {mediaCount?mediaCount:0} items
</Text>
        </View>

      </View>
      
    </TouchableNativeFeedback>
  );
};