# 길이음(GilIEum) 시스템 다이어그램 명세서

심사위원의 기술적 상세 설명 요구에 대응하기 위해, 논문에 삽입하기 적합한 형태의 다이어그램 코드(Mermaid)를 제공합니다. 아래 코드를 Mermaid를 지원하는 에디터(Notion, GitHub, Mermaid Live Editor 등)에 복사하여 사용하세요.

---

## 1. RAG 기반 여행 코스 추천 흐름도 (RAG Pipeline Flow)

이 다이어그램은 사용자 입력부터 최종 코스 생성까지의 시맨틱 검색 엔진 흐름을 보여줍니다.

```mermaid
graph LR
    subgraph 사용자_인터페이스[사용자 인터페이스]
        A[사용자 입력: 연령, 성별, 동행, 이동수단] --> B[여행 맥락 생성]
    end

    subgraph RAG_엔진[RAG 엔진]
        B --> C[KoSimCSE 임베딩 모듈]
        C --> D{pgvector 검색}
        
        subgraph 데이터베이스_Supabase[데이터베이스 - Supabase]
            E[(관광지 벡터 저장소)]
        end
        
        D -- 코사인 유사도 계산 --> E
        E -- 후보지 추출 --> F[사전 필터링 및 하이브리드 랭킹]
    end

    subgraph 생성_단계[생성 단계]
        F -- 상위 15개 후보지 전달 --> G[프롬프트 증강]
        G --> H[[LG EXAONE 3.5 LLM]]
        H --> I[구조화된 JSON 파싱]
    end

    subgraph 최종_출력[최종 출력]
        I --> J[최적화된 여행 코스 생성]
    end

    style H fill:#f9f,stroke:#333,stroke-width:2px
    style E fill:#bbf,stroke:#333,stroke-width:2px
```

---

## 2. 지속적 학습 피드백 루프 (Continuous Learning Loop)

이 다이어그램은 실시간 지오펜싱 데이터를 통해 시스템이 어떻게 자가 학습(Re-learning)하고 최적화되는지를 보여줍니다.

```mermaid
graph LR
    subgraph 클라이언트_모바일[클라이언트 - 모바일]
        A[실시간 GPS 모니터링] --> B{지오펜싱 트리거}
        B -- 진입/이탈 감지 --> C[체류 시간 계산]
    end

    subgraph 백엔드_서버[백엔드 서버]
        C --> D[POST /api/feedback]
        D --> E[(피드백 및 방문 로그 저장)]
    end

    subgraph 배치_작업_Celery[배치 작업 - Celery]
        E --> F[일일 배치 작업 수행: 새벽 02:00]
        F --> G[체류 시간 및 별점 데이터 분석]
        G --> H[관광지 메타데이터 업데이트]
    end

    subgraph 추천_시스템_반영[추천 시스템 반영]
        H --> I[인기 가중치 갱신]
        I --> J[향후 RAG 검색 엔진 고도화]
    end

    J -.-> A

    style F fill:#dfd,stroke:#333,stroke-width:2px
    style G fill:#dfd,stroke:#333,stroke-width:2px
```

---

## 3. 논문 활용 팁 (Paper Tips)

- **Fig 1. RAG 파이프라인 아키텍처**: 첫 번째 다이어그램은 논문의 "3장. 제안하는 시스템" 섹션에 넣어 RAG의 구체적인 작동 방식을 설명할 때 사용하세요.
- **Fig 2. 지속적 학습 피드백 루프**: 두 번째 다이어그램은 "3.3절. 피드백 기반 재학습 구조" 섹션에 넣어 심사위원이 지적한 기술적 상세 설명을 보완하는 데 활용하세요.
- **용어 사용**: 논문에서는 '재학습'이라는 말 대신 **"사용자 피드백 기반 동적 가중치 최적화 구조"** 또는 **"지오펜싱 체류 시간 기반 온라인 학습"**이라는 용어를 쓰시면 훨씬 전문적으로 보입니다.
