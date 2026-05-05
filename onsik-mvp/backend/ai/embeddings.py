from langchain_huggingface import HuggingFaceEmbeddings
import torch

# 768차원 다국어 지원 모델 (KoSimCSE-roberta)
# LangChain의 HuggingFaceEmbeddings로 래핑하여 사용
_embeddings = None

def get_embeddings_model():
    """LangChain 호환 임베딩 모델 인스턴스를 반환합니다."""
    global _embeddings
    if _embeddings is None:
        print("Loading KoSimCSE Model into LangChain interface...")
        model_name = "BM-K/KoSimCSE-roberta-multitask"
        model_kwargs = {'device': 'cuda' if torch.cuda.is_available() else 'cpu'}
        encode_kwargs = {'normalize_embeddings': True}
        
        _embeddings = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs=model_kwargs,
            encode_kwargs=encode_kwargs
        )
    return _embeddings

def get_embedding(text: str) -> list[float]:
    """텍스트의 임베딩 벡터를 반환합니다."""
    model = get_embeddings_model()
    return model.embed_query(text)
