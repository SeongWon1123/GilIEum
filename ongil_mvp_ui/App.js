import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  Pressable,
} from "react-native";

const { width } = Dimensions.get("window");

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SPOTS = [
  { id: "wetland", name: "순천만습지", tags: ["family", "nature", "walk"], dist: 3.2, stay: 90, lat: 34.8895, lng: 127.5096 },
  { id: "garden", name: "순천만국가정원", tags: ["family", "couple", "photo"], dist: 2.1, stay: 120, lat: 34.9341, lng: 127.5035 },
  { id: "drama", name: "순천드라마촬영장", tags: ["friends", "photo", "culture"], dist: 1.8, stay: 70, lat: 34.9396, lng: 127.5254 },
  { id: "naganeup", name: "낙안읍성", tags: ["family", "history", "education"], dist: 8.4, stay: 85, lat: 34.9483, lng: 127.3437 },
  { id: "lake", name: "조례호수공원", tags: ["friends", "walk", "free"], dist: 1.5, stay: 45, lat: 34.9515, lng: 127.5208 },
  { id: "songgwang", name: "송광사", tags: ["quiet", "history", "healing"], dist: 12.0, stay: 70, lat: 35.0022, lng: 127.2587 },
];

const ageOptions = [
  { label: "10대", value: "10s" },
  { label: "20대", value: "20s" },
  { label: "30대", value: "30s" },
  { label: "40대", value: "40s" },
  { label: "50대", value: "50s" },
  { label: "60대 이상", value: "60plus" },
];

const genderOptions = [
  { label: "남성", value: "male" },
  { label: "여성", value: "female" },
  { label: "선택 안함", value: "other" },
];

const companionOptions = [
  { label: "가족", value: "family" },
  { label: "친구", value: "friends" },
  { label: "연인", value: "couple" },
  { label: "혼자", value: "solo" },
];

const transportOptions = [
  { label: "자차", value: "car" },
  { label: "대중교통", value: "public" },
  { label: "도보", value: "walk" },
];

function OptionRow({ title, value, onChange, options }) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{title}</Text>
      <View style={styles.rowWrap}>
        {options.map((item) => {
          const isActive = value === item.value;
          return (
            <Pressable
              key={item.value}
              style={({ pressed }) => [
                styles.chip,
                isActive && styles.chipActive,
                pressed && { opacity: 0.8 },
                pressed && !isActive && { backgroundColor: "#f1f5f9" }
              ]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                onChange(item.value);
              }}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function recommendCourse({ companionType, placeCount, transport }) {
  const speed = transport === "car" ? 35 : transport === "public" ? 22 : 4;
  const scored = SPOTS.map((spot) => {
    let score = 100 - spot.dist * 2;
    if (spot.tags.includes(companionType)) score += 20;
    if (transport === "walk" && spot.tags.includes("walk")) score += 10;
    return { ...spot, score };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, placeCount);

  let totalDistance = 0;
  let totalMin = 0;
  const startHour = 10;
  const startMinute = 0;

  const stops = scored.map((spot, index) => {
    const travelMin = Math.round((spot.dist / speed) * 60);
    const beforeMin = stopsTravelStayMinutes(scored.slice(0, index), speed);
    const arriveTotal = startHour * 60 + startMinute + beforeMin + travelMin;
    const arrive = `${String(Math.floor(arriveTotal / 60)).padStart(2, "0")}:${String(
      arriveTotal % 60
    ).padStart(2, "0")}`;

    totalDistance += spot.dist;
    totalMin += travelMin + spot.stay;

    return {
      order: index + 1,
      id: spot.id,
      name: spot.name,
      dist: spot.dist,
      stay: spot.stay,
      arrive,
      tags: spot.tags,
      lat: spot.lat,
      lng: spot.lng,
    };
  });

  return {
    summary: `맞춤형 ${placeCount}곳 코스 완성! 🚀`,
    totalDistance: totalDistance.toFixed(1),
    totalMin,
    stops,
  };
}

function stopsTravelStayMinutes(stops, speed) {
  return stops.reduce((acc, item) => {
    const travel = Math.round((item.dist / speed) * 60);
    return acc + travel + item.stay;
  }, 0);
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

const PRIMARY_COLOR = "#4f46e5"; // Indigo-600
const PRIMARY_LIGHT = "#e0e7ff"; // Indigo-100
const BACKGROUND_COLOR = "#f8fafc"; // Slate-50

function KakaoMapSection({ stops }) {
  const mapRef = useRef(null);
  const [mapStatus, setMapStatus] = useState("idle");
  const [mapError, setMapError] = useState("");
  const [scriptSrc, setScriptSrc] = useState("");

  const key = process.env.EXPO_PUBLIC_KAKAO_JS_KEY || "";
  const host = Platform.OS === "web" && typeof window !== "undefined" ? window.location.host : "n/a";

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    if (!stops?.length) {
      return;
    }
    if (!key) {
      setMapStatus("missing-key");
      return;
    }

    let mapNode = mapRef.current;
    if (!mapNode) return;

    const createMap = () => {
      if (!window.kakao?.maps) {
        setMapStatus("sdk-error");
        setMapError("카카오 SDK가 로드되지 않았습니다.");
        return;
      }

      window.kakao.maps.load(() => {
        try {
          const resolvedStops = stops;
          if (!resolvedStops || resolvedStops.length === 0) return;

          const first = resolvedStops[0];
          const map = new window.kakao.maps.Map(mapNode, {
            center: new window.kakao.maps.LatLng(first.lat, first.lng),
            level: 7,
          });

          setTimeout(() => {
            map.relayout();
          }, 100);

          const bounds = new window.kakao.maps.LatLngBounds();

          resolvedStops.forEach((stop) => {
            const latLng = new window.kakao.maps.LatLng(stop.lat, stop.lng);
            bounds.extend(latLng);

            const marker = new window.kakao.maps.Marker({
              map,
              position: latLng,
              title: stop.name,
            });

            const infowindow = new window.kakao.maps.InfoWindow({
              content: `<div style="padding:6px 8px;font-size:12px;">${stop.order}. ${stop.name}</div>`,
            });

            window.kakao.maps.event.addListener(marker, "click", () => {
              infowindow.open(map, marker);
            });
          });

          map.setBounds(bounds);
          setMapStatus("ready");
          setMapError("");
        } catch (error) {
          setMapStatus("render-error");
          setMapError(String(error?.message || error));
        }
      });
    };

    if (window.kakao?.maps) {
      setMapStatus("loading");
      createMap();
      return;
    }

    const script = document.createElement("script");
    setMapStatus("loading");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    setScriptSrc(script.src);
    script.async = true;
    script.onload = createMap;
    script.onerror = () => {
      setMapStatus("script-error");
      setMapError("카카오 SDK 로드 실패.");
    };
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [stops]);

  if (Platform.OS !== "web") {
    return (
      <View style={styles.mapSection}>
        <Text style={styles.mapTitle}>지도 미리보기</Text>
        <Text style={styles.mapHelpText}>웹 환경에서 카카오 지도를 확인할 수 있습니다.</Text>
      </View>
    );
  }

  if (!process.env.EXPO_PUBLIC_KAKAO_JS_KEY) {
    return (
      <View style={styles.mapSection}>
        <Text style={styles.mapTitle}>지도 미리보기</Text>
        <Text style={styles.mapHelpText}>`.env`에 `EXPO_PUBLIC_KAKAO_JS_KEY`를 추가하면 마커가 표시됩니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.mapSection}>
      <Text style={styles.mapTitle}>지도 미리보기 (카카오맵)</Text>
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <div
            ref={mapRef}
            style={{ width: "100%", height: "100%", borderRadius: 16 }}
          />
        ) : (
          <View ref={mapRef} style={{ width: "100%", height: "100%", borderRadius: 16 }} />
        )}
      </View>
    </View>
  );
}

export default function App() {
  const [companionCount, setCompanionCount] = useState("3");
  const [companions, setCompanions] = useState([
    { id: 0, age: "20s", gender: "female", label: "본인" },
    { id: 1, age: "20s", gender: "female", label: "동행 1" },
    { id: 2, age: "20s", gender: "female", label: "동행 2" },
  ]);
  const [companionType, setCompanionType] = useState("friends");
  const [transport, setTransport] = useState("public");
  const [placeCount, setPlaceCount] = useState("3");
  const [submitted, setSubmitted] = useState(false);

  // Sync companion array size with companionCount input
  useEffect(() => {
    const count = parseInt(companionCount, 10);
    if (!isNaN(count) && count > 0 && count <= 10) {
      setCompanions((prev) => {
        if (count === prev.length) return prev;
        const newArr = [...prev];
        if (count > prev.length) {
          for (let i = prev.length; i < count; i++) {
            newArr.push({ id: i, age: "20s", gender: "other", label: `동행 ${i}` });
          }
        } else {
          newArr.length = count;
        }
        return newArr;
      });
    }
  }, [companionCount]);

  const updateCompanion = (index, field, value) => {
    const updated = [...companions];
    updated[index] = { ...updated[index], [field]: value };
    setCompanions(updated);
  };

  const parsedPlaceCount = Math.max(1, Math.min(5, Number(placeCount) || 3));

  const result = useMemo(
    () => recommendCourse({ companionType, placeCount: parsedPlaceCount, transport }),
    [companionType, parsedPlaceCount, transport]
  );

  const handleRecommend = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setSubmitted(true);
  };

  const handleReset = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSubmitted(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerAppTitle}>길이음</Text>
          <View style={styles.betaBadge}>
            <Text style={styles.betaBadgeText}>BETA</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>단 하나뿐인 AI 맞춤 여행 코스</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!submitted ? (
          <View style={styles.formContainer}>
            <View style={styles.heroSection}>
              <Text style={styles.heroText}>당신에게 완벽한</Text>
              <Text style={styles.heroTextHighlight}>순천 여행을 이어드립니다.</Text>
            </View>

            <View style={styles.columns}>
              <View style={[styles.block, styles.columnBlock]}>
                <Text style={styles.label}>동행 인원</Text>
                <TextInput
                  value={companionCount}
                  onChangeText={(text) => {
                    // Prevent deleting entirely to avoid NaN crashing immediately
                    const safeText = text.replace(/[^0-9]/g, '');
                    setCompanionCount(safeText);
                  }}
                  keyboardType="numeric"
                  style={styles.input}
                  placeholder="예: 3"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={[styles.block, styles.columnBlock]}>
                <Text style={styles.label}>장소 개수 (1~5)</Text>
                <TextInput
                  value={placeCount}
                  onChangeText={(text) => setPlaceCount(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  style={styles.input}
                  placeholder="예: 3"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.companionList}>
              {companions.map((comp, index) => (
                <View key={comp.id} style={{ marginBottom: 16 }}>
                  <Text style={[styles.label, { paddingLeft: 8 }]}>{comp.label}</Text>
                  <OptionRow
                    title="연령대"
                    value={comp.age}
                    onChange={(val) => updateCompanion(index, "age", val)}
                    options={ageOptions}
                  />
                  <OptionRow
                    title="성별"
                    value={comp.gender}
                    onChange={(val) => updateCompanion(index, "gender", val)}
                    options={genderOptions}
                  />
                </View>
              ))}
            </View>
            <OptionRow
              title="동행 유형"
              value={companionType}
              onChange={setCompanionType}
              options={companionOptions}
            />
            <OptionRow
              title="이동수단"
              value={transport}
              onChange={setTransport}
              options={transportOptions}
            />

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
              ]}
              onPress={handleRecommend}
            >
              <Text style={styles.actionButtonText}>맞춤 코스 추천받기</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <View style={styles.resultSummaryContainer}>
                <Text style={styles.resultSummary}>{result.summary}</Text>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipIcon}>🚗</Text>
                  <Text style={styles.metaChipText}>{result.totalDistance}km</Text>
                </View>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipIcon}>⏱️</Text>
                  <Text style={styles.metaChipText}>{Math.floor(result.totalMin / 60)}시간 {result.totalMin % 60}분</Text>
                </View>
              </View>
            </View>

            <View style={styles.timeline}>
              {result.stops.map((stop, index) => {
                const isLast = index === result.stops.length - 1;
                return (
                  <View key={`${stop.order}-${stop.name}`} style={styles.timelineItem}>

                    <View style={styles.timelineNode}>
                      <Text style={styles.timelineOrderText}>{stop.order}</Text>
                    </View>

                    <View style={styles.timelineContent}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{stop.name}</Text>
                        <View style={styles.timeBadgeInfo}>
                          <Text style={styles.timeBadgeInfoText}>{stop.arrive} 도착</Text>
                        </View>
                      </View>

                      <View style={styles.cardDetailsRow}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>이동</Text>
                          <Text style={styles.detailValue}>{stop.dist}km</Text>
                        </View>
                        <View style={styles.detailDivider} />
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>체류</Text>
                          <Text style={styles.detailValue}>{stop.stay}분</Text>
                        </View>
                      </View>

                      <View style={styles.cardTags}>
                        {stop.tags.map(tag => (
                          <View key={tag} style={styles.miniTag}>
                            <Text style={styles.miniTagText}>#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <KakaoMapSection stops={result.stops} />

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && { backgroundColor: "#f1f5f9" }
              ]}
              onPress={handleReset}
            >
              <Text style={styles.secondaryButtonText}>조건 변경하기</Text>
            </Pressable>
          </View>
        )
        }
      </ScrollView >
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "android" ? 50 : 20,
    paddingBottom: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAppTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1e1b4b", // Deep Indigo
    letterSpacing: -0.7,
  },
  betaBadge: {
    marginLeft: 8,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  betaBadgeText: {
    color: PRIMARY_COLOR,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 6,
    letterSpacing: -0.2,
  },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  formContainer: {},
  heroSection: {
    marginTop: 12,
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  heroText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#334155",
    letterSpacing: -0.5,
  },
  heroTextHighlight: {
    fontSize: 26,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    marginTop: 6,
    letterSpacing: -0.5,
  },
  block: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  columns: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  columnBlock: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    backgroundColor: "#f8fafc",
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  chipText: {
    color: "#64748b",
    fontWeight: "700",
    fontSize: 14,
  },
  chipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionButton: {
    marginTop: 16,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: -0.2,
  },
  resultContainer: {
    marginTop: 10,
  },
  resultHeader: {
    marginBottom: 32,
    alignItems: "center",
  },
  resultSummaryContainer: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    marginBottom: 16,
  },
  resultSummary: {
    fontSize: 18,
    fontWeight: "800",
    color: PRIMARY_COLOR,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metaChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  metaChipText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#334155",
  },
  timeline: {
    paddingLeft: 12,
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 24,
    position: "relative",
  },
  timelineNode: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 4,
    borderColor: BACKGROUND_COLOR,
  },
  timelineOrderText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: "900",
    color: "#1e293b",
    marginRight: 8,
    letterSpacing: -0.3,
  },
  timeBadgeInfo: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  timeBadgeInfoText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
  },
  cardDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#334155",
  },
  detailDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "#e2e8f0",
  },
  cardTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  miniTag: {
    backgroundColor: PRIMARY_LIGHT + "60",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miniTagText: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: "700",
  },
  mapSection: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    padding: 14,
    marginBottom: 12,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 10,
  },
  mapContainer: {
    height: 280,
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  mapHelpText: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
  mapDiagText: {
    marginTop: 6,
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  mapErrorText: {
    marginTop: 8,
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#475569",
    fontWeight: "900",
    fontSize: 17,
  },
});
