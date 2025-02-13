import io
import json
import os

import runpod
import torch
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from PIL import Image
from runpod import RunPodLogger
from transformers import AutoModel, AutoTokenizer

# Set up logging
logger = RunPodLogger()

# Model and resource configuration
MODEL_NAME = "openbmb/MiniCPM-o-2_6"
EXAMPLES_PATH = "./examples"
SYSTEM_PROMPT_PATH = "./prompt.txt"
MAX_DIM = 1280


def initialize_drive_service():
    """
    Initialize the Google Drive service using credentials from an environment variable.
    """
    # Load the service account info from the environment variable.
    service_account_info = json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT_KEY"])
    credentials = service_account.Credentials.from_service_account_info(
        service_account_info,
        scopes=["https://www.googleapis.com/auth/drive.readonly"],
    )
    return build("drive", "v3", credentials=credentials)


def download_image_from_drive(file_id, drive_service):
    """
    Downloads an image from Google Drive using the file_id and returns a PIL Image.
    """
    request = drive_service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while not done:
        status, done = downloader.next_chunk()
    fh.seek(0)
    return Image.open(fh)


def load_system_prompt():
    """
    Load and return the system prompt from a text file.
    """
    with open(SYSTEM_PROMPT_PATH, "r") as f:
        return f.read()


def initialize_model():
    """
    Initialize the pretrained model, set it to evaluation mode,
    and move it to the GPU.
    """
    torch.cuda.empty_cache()
    model = AutoModel.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
        attn_implementation="sdpa",
        torch_dtype=torch.bfloat16,
    )
    model = model.eval().cuda()
    return model


def initialize_tokenizer():
    """
    Initialize and return the tokenizer for the model.
    """
    return AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)


def load_few_shot_examples(system_prompt):
    """
    Load few-shot examples from a JSON file. Each example includes images
    and an answer. The examples are formatted into a conversation structure.
    """
    with open(f"{EXAMPLES_PATH}/examples.json", "r") as f:
        answers = json.load(f)

    examples = []
    for answer in answers:
        # Load and convert images to RGB.
        images = [
            Image.open(f"{EXAMPLES_PATH}/{image}").convert("RGB").resize((MAX_DIM, MAX_DIM))
            for image in answer["images"]
        ]
        # User example with images and system prompt.
        examples.append({"role": "user", "content": [*images, system_prompt]})
        # Assistant's answer.
        examples.append({"role": "assistant", "content": [answer["answer"]]})
    return examples


def handle_inference(event):
    """
    Main function to run the model chat.
    """
    logger.info(f"Received event: {event}")

    input = event.get("input")

    # Initialize components.
    try:
        model = initialize_model()
        tokenizer = initialize_tokenizer()
    except Exception as e:
        msg = f"Error initializing model: {e}"
        logger.error(msg)
        return {"error": msg}

    try: 
        system_prompt = load_system_prompt()
        few_shot_examples = load_few_shot_examples(system_prompt)
    except Exception as e:
        msg = f"Error loading few-shot examples or system prompt: {e}"
        logger.error(msg)
        return {"error": msg}

    # Initialize Google Drive service using the env var.
    try:
        drive_service = initialize_drive_service()
    except Exception as e:
        msg = f"Error initializing Google Drive service: {e}"
        logger.error(msg)
        return {"error": msg}

    parsed_event_results = []
    submissions = input["submissions"]
    for submission in submissions:
        logger.info(f"Downloading images: {submission['imageIds']}")
        try:
            images = [
                download_image_from_drive(image_id, drive_service).convert("RGB").thumbnail((MAX_DIM, MAX_DIM))    
                for image_id in submission["imageIds"]
            ]
        except Exception as e:
            logger.error(f"Error downloading images for submission id {submission['submissionId']}: {e}")

        # Prepare the chat messages with few-shot examples and current prompt.
        msgs = [
            *few_shot_examples,
            {"role": "user", "content": [*images, system_prompt]},
        ]

        # Execute the chat and print the answer.
        logger.info("Running model...")
        try:
            answer = model.chat(msgs=msgs, tokenizer=tokenizer)
            result = {"submissionId": submission["submissionId"], "answer": answer}
            parsed_event_results.append(result)
            logger.info(result)
        except Exception as e:
            logger.error(f"Error running model for submission id {submission['submissionId']}: {e}")

    return parsed_event_results


if __name__ == "__main__":
    # Payload should be JSON that looks like:
    # {
    #   "submissions": [
    #     {
    #       "submissionId": "submission_id1",
    #       "imageIds": ["image_id1", "image_id2"]
    #     },
    #     {
    #       "submissionId": "submission_id2",
    #       "imageIds": ["image_id3", "image_id4"]
    #     }
    #   ]
    # }
    runpod.serverless.start({"handler": handle_inference})
