import os
from dotenv import load_dotenv
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from langchain_huggingface import HuggingFacePipeline

load_dotenv()

# 모델명: EXAONE 3.5 2.4B Instruct (RTX 4060 8GB VRAM에 최적)
MODEL_NAME = "LGAI-EXAONE/EXAONE-3.5-2.4B-Instruct"

# 싱글톤 인스턴스
_llm = None

def _load_llm():
    """EXAONE 3.5 2.4B 모델을 bfloat16으로 로드합니다 (양자화 불필요)."""
    global _llm
    if _llm is not None:
        return _llm

    hf_token = os.getenv("HF_TOKEN")
    use_gpu = torch.cuda.is_available()
    device = "cuda" if use_gpu else "cpu"
    dtype = torch.bfloat16 if use_gpu else torch.float32

    if use_gpu:
        print(f"[llm_client] GPU 감지: {torch.cuda.get_device_name(0)} ({torch.cuda.get_device_properties(0).total_memory // 1024**2}MB)")
    else:
        print(f"[llm_client] GPU 미감지. CPU 모드로 로드합니다...")

    print(f"[llm_client] Loading {MODEL_NAME} ({dtype}, {device})...")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, token=hf_token, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        token=hf_token,
        torch_dtype=dtype,
        device_map="auto" if use_gpu else None,
        trust_remote_code=True
    )
    if not use_gpu:
        model = model.to(device)

    # 파이프라인 생성
    pipe = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=512,
        temperature=0.7,
        top_p=0.95,
        repetition_penalty=1.0,
        do_sample=True
    )

    _llm = HuggingFacePipeline(pipeline=pipe)
    print(f"[llm_client] ✅ EXAONE 3.5 2.4B loaded successfully on {device}.")
    return _llm

def get_llm():
    """LangChain LLM 인스턴스를 반환합니다."""
    return _load_llm()

def generate_text_advanced(messages: list, max_new_tokens: int = 512) -> str:
    """
    (하위 호환용) 메시지 리스트를 받아 텍스트를 생성합니다.
    LangChain의 invoke를 활용합니다.
    """
    llm = get_llm()
    
    # Chat Template 적용을 위해 tokenizer 접근이 필요하므로 직접 pipe 호출 방식 병행
    tokenizer = llm.pipeline.tokenizer
    prompt = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=False
    )
    
    response = llm.invoke(prompt)
    
    # 생성된 부분만 추출 (HuggingFacePipeline은 입력값도 포함할 수 있음)
    if response.startswith(prompt):
        return response[len(prompt):].strip()
    return response.strip()
