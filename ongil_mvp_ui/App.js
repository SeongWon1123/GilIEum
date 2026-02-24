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
import { Feather, FontAwesome5 } from "@expo/vector-icons";

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
                pressed && !isActive && { backgroundColor: PRIMARY_LIGHT }
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

const PRIMARY_COLOR = "#059669"; // emerald-600
const PRIMARY_LIGHT = "#ecfdf5"; // emerald-50
const SECONDARY_COLOR = "#0d9488"; // teal-600
const SECONDARY_LIGHT = "#f0fdfa"; // teal-50
const BACKGROUND_COLOR = "#f8fafc"; // slate-50

function KakaoMapSection({ stops }) {
  const mapRef = useRef(null);
  const [mapStatus, setMapStatus] = useState("idle");
  const [mapError, setMapError] = useState("");
  const [scriptSrc, setScriptSrc] = useState("");

  const key = process.env.EXPO_PUBLIC_KAKAO_JS_KEY || "";
  const restKey = process.env.EXPO_PUBLIC_KAKAO_REST_KEY || "";
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
          const linePath = [];

          resolvedStops.forEach((stop) => {
            const latLng = new window.kakao.maps.LatLng(stop.lat, stop.lng);
            bounds.extend(latLng);
            linePath.push(latLng);

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

          // Fetch actual driving route from Kakao Mobility Directions API
          const getDirectionsPath = async (stopsList) => {
            if (stopsList.length < 2) return;
            if (!restKey) {
              console.warn("EXPO_PUBLIC_KAKAO_REST_KEY is missing. Falling back to straight line.");
              drawStraightPolyline();
              return;
            }

            const origin = `${stopsList[0].lng},${stopsList[0].lat}`;
            const dest = `${stopsList[stopsList.length - 1].lng},${stopsList[stopsList.length - 1].lat}`;

            let waypoints = "";
            if (stopsList.length > 2) {
              const wp = stopsList.slice(1, stopsList.length - 1).map(s => `${s.lng},${s.lat}`);
              waypoints = `&waypoints=${wp.join('|')}`;
            }

            const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin}&destination=${dest}${waypoints}`;

            try {
              const response = await fetch(url, {
                method: 'GET',
                headers: {
                  Authorization: `KakaoAK ${restKey}`
                }
              });

              const data = await response.json();
              if (data.routes && data.routes[0]) {
                const pathCoords = [];
                data.routes[0].sections.forEach(section => {
                  section.roads.forEach(road => {
                    for (let i = 0; i < road.vertexes.length; i += 2) {
                      const lng = road.vertexes[i];
                      const lat = road.vertexes[i + 1];
                      pathCoords.push(new window.kakao.maps.LatLng(lat, lng));
                    }
                  });
                });

                const polyline = new window.kakao.maps.Polyline({
                  path: pathCoords,
                  strokeWeight: 5,
                  strokeColor: PRIMARY_COLOR,
                  strokeOpacity: 0.8,
                  strokeStyle: 'solid'
                });
                polyline.setMap(map);
              } else {
                console.warn('Routing failed, falling back to straight polyline');
                drawStraightPolyline();
              }
            } catch (err) {
              console.error('Error fetching directions:', err);
              drawStraightPolyline();
            }
          };

          const drawStraightPolyline = () => {
            const polyline = new window.kakao.maps.Polyline({
              path: linePath,
              strokeWeight: 4,
              strokeColor: PRIMARY_COLOR,
              strokeOpacity: 0.8,
              strokeStyle: 'solid'
            });
            polyline.setMap(map);
          };

          // Trigger driving route draw
          getDirectionsPath(resolvedStops);

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
  const [screen, setScreen] = useState('home'); // 'home', 'input', 'result'
  const [companionCount, setCompanionCount] = useState("3");
  const [companions, setCompanions] = useState([
    { id: 0, age: "20s", gender: "female", label: "본인" },
    { id: 1, age: "20s", gender: "female", label: "동행 1" },
    { id: 2, age: "20s", gender: "female", label: "동행 2" },
  ]);
  const [companionType, setCompanionType] = useState("friends");
  const [transport, setTransport] = useState("public");
  const [placeCount, setPlaceCount] = useState("3");

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
    [companionType, parsedPlaceCount, transport, screen]
  );

  const handleRecommend = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setScreen('result');
  };

  const handleReset = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setScreen('input');
  };

  const renderHome = () => (
    <View style={styles.homeContainer}>
      <View style={styles.bgDecorR1} />
      <View style={styles.bgDecorR2} />
      <View style={styles.bgDecorR3} />

      <View style={styles.homeCenter}>
        <View style={styles.logoRow}>
          <View style={styles.logoWrapper}>
            <FontAwesome5 name="mountain" size={72} color={PRIMARY_COLOR} />
            <Feather name="compass" size={36} color={SECONDARY_COLOR} style={styles.absoluteCompass} />
          </View>
        </View>

        <Text style={styles.homeTitle}>온길</Text>

        <View style={styles.homeSubtitleRow}>
          <Feather name="map" size={20} color={SECONDARY_COLOR} />
          <Text style={styles.homeSubtitleText}>순천의 모든 여행</Text>
        </View>

        <Text style={styles.homeDesc}>
          자연과 역사가 살아 숨쉬는 순천{"\n"}당신만을 위한 특별한 여행 코스를 만들어드립니다
        </Text>

        <View style={styles.homeFooterRow}>
          <Feather name="navigation" size={14} color={PRIMARY_COLOR} />
          <Text style={styles.homeFooterText}>맞춤형 여행 계획 | 실시간 위치 | 순천 전문</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.actionButton,
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          { alignSelf: 'center', width: 240, marginTop: 40 }
        ]}
        onPress={() => setScreen('input')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.actionButtonText}>여행 시작하기</Text>
          <Feather name="chevron-right" size={22} color="#ffffff" style={{ marginLeft: 8 }} />
        </View>
      </Pressable>
    </View>
  );

  const renderInput = () => (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => setScreen('home')}>
        <Feather name="arrow-left" size={20} color={PRIMARY_COLOR} />
        <Text style={styles.backButtonText}>홈으로</Text>
      </Pressable>

      <View style={styles.inputHeader}>
        <Text style={styles.heroTextHighlight}>온길 in 순천</Text>
        <Text style={styles.inputSub}>몇 가지만 알려주시면 완벽한 코스를 만들어드려요</Text>
      </View>

      <View style={styles.cardBlock}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconBoxPrimary}>
            <Feather name="calendar" size={16} color={PRIMARY_COLOR} />
          </View>
          <Text style={styles.cardHeaderText}>장소 개수 (1~5)</Text>
        </View>

        <View style={styles.counterRow}>
          <Pressable
            style={styles.counterBtn}
            onPress={() => setPlaceCount(String(Math.max(1, parseInt(placeCount) - 1)))}
          >
            <Text style={styles.counterBtnText}>−</Text>
          </Pressable>
          <View style={styles.counterValueBox}>
            <Text style={styles.counterValueNum}>{placeCount}</Text>
            <Text style={styles.counterValueUnit}>곳</Text>
          </View>
          <Pressable
            style={styles.counterBtn}
            onPress={() => setPlaceCount(String(Math.min(5, parseInt(placeCount) + 1)))}
          >
            <Text style={styles.counterBtnText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.helpTextCenter}>루트에 포함할 주요 장소 개수를 선택하세요</Text>
      </View>

      <View style={[styles.cardBlock, { borderColor: SECONDARY_LIGHT, borderWidth: 1 }]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconBoxSecondary}>
            <Feather name="users" size={16} color={SECONDARY_COLOR} />
          </View>
          <Text style={styles.cardHeaderText}>동반인 정보 ({companionCount}명)</Text>
        </View>

        <View style={styles.counterRowSmall}>
          <Text style={styles.label}>총 인원수: </Text>
          <TextInput
            value={companionCount}
            onChangeText={(text) => setCompanionCount(text.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            style={styles.inputSmall}
          />
        </View>

        <View style={styles.companionList}>
          {companions.map((comp, index) => (
            <View key={comp.id} style={styles.companionItemCard}>
              <Text style={styles.companionItemLabel}>{comp.label}</Text>
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
        <Text style={styles.actionButtonText}>여행 코스 만들기 →</Text>
      </Pressable>
    </ScrollView>
  );

  const renderResult = () => (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => setScreen('input')}>
        <Feather name="arrow-left" size={20} color={PRIMARY_COLOR} />
        <Text style={styles.backButtonText}>코스 재설정</Text>
      </Pressable>

      <View style={styles.resultHeader}>
        <View style={styles.resultSummaryContainer}>
          <Text style={styles.resultSummary}>{result.summary}</Text>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Feather name="navigation" size={16} color={PRIMARY_COLOR} style={{ marginRight: 6 }} />
            <Text style={styles.metaChipText}>{result.totalDistance}km</Text>
          </View>
          <View style={styles.metaChip}>
            <Feather name="clock" size={16} color={SECONDARY_COLOR} style={{ marginRight: 6 }} />
            <Text style={styles.metaChipText}>{Math.floor(result.totalMin / 60)}시간 {result.totalMin % 60}분</Text>
          </View>
        </View>
      </View>

      <View style={styles.timeline}>
        {result.stops.map((stop, index) => {
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
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {screen === 'home' && renderHome()}
      {screen === 'input' && renderInput()}
      {screen === 'result' && renderResult()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  // Home Screen Styles
  homeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: PRIMARY_LIGHT,
  },
  bgDecorR1: {
    position: "absolute",
    top: 40,
    left: -40,
    width: 250,
    height: 250,
    backgroundColor: SECONDARY_LIGHT,
    borderRadius: 125,
    opacity: 0.6,
  },
  bgDecorR2: {
    position: "absolute",
    bottom: 20,
    right: -50,
    width: 300,
    height: 300,
    backgroundColor: "#ccfbf1", // cyan-100 fallback
    borderRadius: 150,
    opacity: 0.5,
  },
  bgDecorR3: {
    position: "absolute",
    top: "30%",
    left: "10%",
    width: 400,
    height: 400,
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 200,
    opacity: 0.4,
  },
  homeCenter: {
    alignItems: "center",
    zIndex: 10,
    marginBottom: 40,
  },
  logoRow: {
    marginBottom: 20,
  },
  logoWrapper: {
    position: 'relative',
  },
  absoluteCompass: {
    position: 'absolute',
    bottom: -8,
    right: -12,
  },
  homeTitle: {
    fontSize: 56,
    fontWeight: "900",
    color: "#047857", // emerald-700
    marginBottom: 16,
  },
  homeSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  homeSubtitleText: {
    fontSize: 20,
    color: "#334155",
    fontWeight: "600",
    marginLeft: 8,
  },
  homeDesc: {
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  homeFooterRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  homeFooterText: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: "600",
    marginLeft: 6,
  },
  homeButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
  },
  homeButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginRight: 8,
  },
  // Input & Result Screen Styles
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    marginTop: Platform.OS === 'android' ? 30 : 10,
  },
  backButtonText: {
    color: PRIMARY_COLOR,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 6,
  },
  inputHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  heroTextHighlight: {
    fontSize: 28,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  inputSub: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  cardBlock: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PRIMARY_LIGHT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconBoxPrimary: {
    width: 32,
    height: 32,
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  iconBoxSecondary: {
    width: 32,
    height: 32,
    backgroundColor: SECONDARY_LIGHT,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardHeaderText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  counterBtn: {
    width: 44,
    height: 44,
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: {
    fontSize: 24,
    color: PRIMARY_COLOR,
    fontWeight: "900",
  },
  counterValueBox: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: BACKGROUND_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  counterValueNum: {
    fontSize: 28,
    fontWeight: "900",
    color: PRIMARY_COLOR,
  },
  counterValueUnit: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "600",
    marginLeft: 4,
  },
  helpTextCenter: {
    textAlign: "center",
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 12,
  },
  counterRowSmall: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  inputSmall: {
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    width: 60,
    textAlign: "center",
  },
  companionList: {
    gap: 12,
  },
  companionItemCard: {
    backgroundColor: SECONDARY_LIGHT,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ccfbf1",
  },
  companionItemLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: SECONDARY_COLOR,
    marginBottom: 8,
  },
  block: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#ffffff",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    fontSize: 13,
  },
  chipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  actionButton: {
    marginTop: 16,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: -0.2,
  },
  resultHeader: {
    marginBottom: 32,
    alignItems: "center",
  },
  resultSummaryContainer: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  resultSummary: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
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
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timeBadgeInfoText: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY_COLOR,
  },
  cardDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BACKGROUND_COLOR,
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
    backgroundColor: SECONDARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miniTagText: {
    fontSize: 13,
    color: SECONDARY_COLOR,
    fontWeight: "700",
  },
  mapSection: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: BACKGROUND_COLOR,
  },
  mapHelpText: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
});
