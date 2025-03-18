/***********************************************************
 * Two-Step Google Apps Script for GPT-4o with Structured Outputs
 * 
 * STEP 1: 
 *   - Use your exact prompt so GPT-4o can show a step-by-step plan,
 *     transcribe text, summarize, and produce a final JSON (or at
 *     least something close to it).
 *
 * STEP 2:
 *   - Provide "response_format": {type:"json_schema", ...} with strict:true
 *   - GPT-4o transforms the entire text from step 1 into a final 
 *     validated JSON that adheres to your desired fields.
 *
 * Logging is added at each phase so you can debug any issues.
 ***********************************************************/
function analyzeFlyerByGdriveId(fileId) {
  const fileURL = `https://drive.google.com/uc?export=download&id=${fileId}`
  return analyzeFlyer(fileURL)
}

function analyzeFlyer(imageUrl) {
  Logger.log("=== analyzeFlyer() START ===");
  Logger.log("Received flyer imageUrl: " + imageUrl);
  const dayjs = loadDayjs();

  /***********************************************************
   * 1) Retrieve the OpenAI API key
   ***********************************************************/
  const openaiApiKey = PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
  if (!openaiApiKey) {
    const errorMsg = "Missing 'OPENAI_API_KEY' in Script Properties.";
    Logger.log(errorMsg);
    throw new Error(errorMsg);
  }
  Logger.log("Loaded OpenAI API key from script properties (length=" + openaiApiKey.length + ").");

  /***********************************************************
   * 2) Your prompt from prompt-gpt-4o.txt
   ***********************************************************/
  const originalPrompt = `
You are a multimodal AI model trained to parse event flyers or images that may contain text describing upcoming public events. You will use the ChatGPT-4o Computer Vision feature to read the information in the provided image. 

**RULES**
1. *DO NOT* use traditional OCR tools like tesseract or pytesseract
2. ONLY USE GPT-4o COMPUTER VISION
3. NEVER say anything after the final JSON output; it makes it difficult for me to parse your final answer.

---

Your role is to:

1) First, Read and understand this request, then develop a plan to answer my inquiry. Describe how you will approach this request and what your tasks are.
2) Second, **summarize the details presented in the image**. We will refer to this summary as **raw_summary**
3) Third, **Determine** if the content is:
   - **Malicious, abusive, or illegal** (hateful, pornographic, etc.),
   - **No event** (the image does not describe a public event, has no textual content, is a generic email signature, or is otherwise a general photo without event details), or
   - **A valid event** (there is date, location, or other relevant info for a public gathering).  
4) Fourth, **read the image** and transcribe the text word-for-word, describing any visible text on the flyer. Again, do not use python, tesseract, pytesseract, or any other traditional OCR tool. I want your AI model (ChatGPT-4o) to read the image. We will refer to this as the **raw_text**
5) Fifth, If it is a valid event, **extract** the following details step by step in the conversation:
   - **title** (Event name or headline)  
   - **description** (What is happening, the goals, activities, etc. written as a promoter of the event in the "we" perspective)  
   - **city**  
   - **state** (2-letter if US, ‘DC’ for Washington, D.C., 3-letter code if outside US. If the city is present and identifiable, but the state is missing, you may infer the state)  
   - **postal_code**  
   - **address**  
   - **meeting_location**  
   - **date** (YYYY-MM-DD, must be in the future. Today's date is ${dayjs().format('YYYY-MM-DD')}. Always assume that dates in images are in US-format when ambiguous. If a flyer has a date but not a year, assume the current year.)  
   - **time** (Use “hh:mm AM/PM”, if a range is provided, only the start time, do not include a timezone)  
   - **links** (a comma-separated list of each URL present in the image)  
   - **sponsors** (a comma-separated list of each sponsor, organization, or host identifiable in the image)  
   - **status** (one of "success", "malicious_content", "no_event_found")
   - **notes** (a description of the decisions made while processing the image. Note any assumptions, inferences, or biases that were made during the extraction process)
   - **admin_notes** (a short message to the admin about the status of the image, only used if the status is not "success")
6) Sixth, **normalize** the extracted data according to the **Normalization** rules and **Output** rules that follow this list.
7) Seventh, set the **status** field according to the determination made in step 3. If the content is malicious, abusive, or illegal, set status = "malicious_content" with a short admin_notes. If no event is found or the image does not describe an upcoming event or has no location, time, date, description, link, etc., set status = "no_event_found" with a short admin_notes. If a valid event is found with the usual details of a public event announcement, set status = "success" and admin_notes should be empty.
8) Eighth, populate the **notes** field with notes about how the flyer was processed, inferences made, assumptions, biases, etc. This field must be used to tell the end-user about how the image was perceived by the AI model in order to establish trust. 
9) Finally, produce an “admin_notes” field that is empty if the status is “success” and contains a short message if the status is “malicious_content” or “no_event_found” (or otherwise, to explain why the status is not “success”).

# IMPORTANT

ALWAYS PRODUCE A SINGLE JSON OBJECT AS OUTPUT!

# Appendix

## Normalization

- If the event is in the United States, always use 2-letter state codes or ‘DC’. 
- If the event is not in the United States, use a 3-letter country code.
- If the event is **nationwide** or "all states", or "every state capitol", etc., set city and state to “Nationwide”.
- If the event time is given as “Noon”, “Midnight”, or “All day”, convert to standard times:
  - Noon => 12:00 PM
  - Midnight => 12:00 AM
  - All day => 8:00 AM
- If the event date is in the past but recurring, pick the next future date.
- If the event date is missing a year, assume the current year (${dayjs().format('YYYY')})
- Use normal capitalization (avoid ALL CAPS unless it’s an identifiable  acronym).
- For “description”, generate a reasoned summary if not explicitly stated.


## Output

- Always end by producing exactly **one JSON** object with the fields:
  - raw_text
  - raw_summary
  - title
  - description
  - city
  - state
  - postal_code
  - address
  - meeting_location
  - date
  - time
  - links
  - sponsors
  - status
  - notes
  - admin_notes
- If the image is unreadable, set status = "unreadable_image" with a short admin_notes.
- If the flyer is missing information, add a line about each missing field in "notes." This will be displayed to end-users so they can understand the limitations of the AI model.
- If the flyer has been translated, add a line about the translation in "notes."
- If the flyer is recurring, add a line about it in "notes" and say that the date is the next future date.
- If the flyer is for a virtual event, add a line about it in "notes."
- If the flyer is for a nationwide event, add a line about it in "notes."
- If the flyer doesn't specify its state and you infer the location, add a line about it in "notes."
- If the flyer's time has been interpreted in some way, add a line about it in "notes."
- If the flyer's date has been interpreted in some way, add a line about it in "notes."
- If the flyer's address has been interpreted in some way, add a line about it in "notes."
- If the flyer's city has been interpreted in some way, add a line about it in "notes."
- If content is malicious, abusive, or pornographic, set status = "malicious_content" with a short admin_notes.
- If no event is found or the image does not describe an upcoming event set status = "no_event_found" with a short admin_notes.
- If a valid event is found, set status = "success" and admin_notes should be empty.

_Note:_
If any field is unknown or not found, use "" (empty string) or [] for arrays.

**Important**: 
- Always start your response by telling me your plan to address my request in a step-by-step format
- DO NOT FABRICATE INFORMATION. Only extract what you see or can infer from the image text.
- If no date is provided, you can leave "date": "". 
- If no time is provided, you can leave "time": "".
- Do not add any text after the JSON output

That is your overall mission. Follow the conversation steps carefully. 

Now, let's think step-by-step and answer the entire request...
`;
  Logger.log("Constructed originalPrompt. length=" + originalPrompt.length);



  /***********************************************************
   * 2) Fetch and Base64-encode the flyer image
   ***********************************************************/
  let base64DataUrl;
  try {
    Logger.log("Fetching the image from " + imageUrl);
    const response = UrlFetchApp.fetch(imageUrl);
    if (response.getResponseCode() !== 200) {
      throw new Error("Could not fetch image. HTTP code: " + response.getResponseCode());
    }
    const blob = response.getBlob();
    const mimeType = blob.getContentType(); // e.g. "image/jpeg"
    const bytes = blob.getBytes();
    const base64Str = Utilities.base64Encode(bytes);
    // e.g. "data:image/jpeg;base64,<base64EncodedString>"
    base64DataUrl = "data:" + mimeType + ";base64," + base64Str;
    Logger.log("Image successfully fetched & base64-encoded. mimeType=" + mimeType);
  } catch (err) {
    Logger.log("Error fetching or encoding image: " + err);
    throw new Error("Cannot fetch/encode flyer image: " + err);
  }

  /***********************************************************
   * STEP 1: 
   * Make a normal chat call with your entire prompt as system
   * plus the flyer in user content. GPT-4o returns the plan & JSON.
   ***********************************************************/
  Logger.log("STEP 1: Building request body...");
  const step1Body = {
    model: "gpt-4o",  // Must be a GPT-4o snapshot that supports image inputs
    messages: [
      {
        role: "user",
        content: [
          {
            "type": "text",
            "text": originalPrompt
          },
          {
            "type": "image_url",
            "image_url": {
              "url": base64DataUrl,
              "detail": "high"
            }
          }
        ]
      }
    ]  
  };
  Logger.log("STEP 1: Request body built. Sending to OpenAI...");

  Logger.log(step1Body)
  let step1Response;
  try {
    step1Response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`
      },
      payload: JSON.stringify(step1Body),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log("Error in step1 fetch: " + err);
    throw err;
  }

  Logger.log("STEP 1: HTTP response code: " + step1Response.getResponseCode());
  if (step1Response.getResponseCode() !== 200) {
    const errText = step1Response.getContentText();
    Logger.log("STEP 1: Non-200 response: " + errText);
    throw new Error("OpenAI step 1 error: " + errText);
  }

  const step1Json = JSON.parse(step1Response.getContentText());
  if (!step1Json.choices || !step1Json.choices.length) {
    throw new Error("No data in step1 response. Full body:\n" + step1Response.getContentText());
  }
  const step1Output = step1Json.choices[0].message.content || "";
  Logger.log("STEP 1: GPT-4o text length: " + step1Output.length);
  Logger.log(step1Response)

  /***********************************************************
   * STEP 2:
   * We pass the entire output from step 1
   * into a second call with { response_format: { type: "json_schema", ... } }
   * enforcing a strict schema so the final result is purely valid JSON.
   ***********************************************************/
  Logger.log("STEP 2: Building structured output request...");

  // The JSON schema we want
  const step2Body = {
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a JSON-only assistant. Convert the text below into valid JSON (strictly matching the schema)."
      },
      {
        role: "user",
        content: "Below is the GPT-4o text from step1. Extract only the final JSON:\n\n" + step1Output
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "flyerExtractionSchema",
        description: "A JSON object describing the event flyer details from step1",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            raw_text:         { type: "string" },
            raw_summary:      { type: "string" },
            title:            { type: "string" },
            description:      { type: "string" },
            city:             { type: "string" },
            state:            { type: "string" },
            postal_code:      { type: "string" },
            address:          { type: "string" },
            meeting_location: { type: "string" },
            date:             { type: "string" },
            time:             { type: "string" },
            links:            { type: "string" },
            sponsors:         { type: "string" },
            status:           { type: "string" },
            notes:            { type: "string" },
            admin_notes:      { type: "string" }
          },
          required: [
            "raw_text",
            "raw_summary",
            "title",
            "description",
            "city",
            "state",
            "postal_code",
            "address",
            "meeting_location",
            "date",
            "time",
            "links",
            "sponsors",
            "status",
            "notes",
            "admin_notes"
          ]
        }
      }
    }
  };

  Logger.log("STEP 2: Sending request for structured JSON...");
  let step2Response;
  try {
    step2Response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`
      },
      payload: JSON.stringify(step2Body),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log("Error in step2 fetch: " + err);
    throw err;
  }

  Logger.log("STEP 2: HTTP response code: " + step2Response.getResponseCode());
  if (step2Response.getResponseCode() !== 200) {
    const errText = step2Response.getContentText();
    Logger.log("STEP 2: Non-200 response: " + errText);
    throw new Error("OpenAI step 2 error: " + errText);
  }

  const step2Json = JSON.parse(step2Response.getContentText());
  if (!step2Json.choices || !step2Json.choices.length) {
    throw new Error("No data in step2 response. Full body:\n" + step2Response.getContentText());
  }

  const finalMsg = step2Json.choices[0].message;
  Logger.log("STEP 2: finalMsg keys: " + Object.keys(finalMsg));

  // If the model refused or the content is unsafe
  if (finalMsg.refusal) {
    Logger.log("Model refusal: " + finalMsg.refusal);
    throw new Error("Refusal from GPT-4o: " + finalMsg.refusal);
  }

  let finalJson;
  if (finalMsg.parsed) {
    // If the model is truly returning structured JSON in .parsed
    finalJson = finalMsg.parsed;
    Logger.log("STEP 2: Found finalMsg.parsed => " + JSON.stringify(finalJson, null, 2));
  } else {
    Logger.log("STEP 2: No 'parsed' field found, so fallback to finalMsg.content.");
    const content = finalMsg.content;
    if (!content) {
      throw new Error("No content or parsed in finalMsg!");
    }
    try {
      finalJson = JSON.parse(content);
      Logger.log("STEP 2: Successfully parsed finalMsg.content as JSON:\n" + JSON.stringify(finalJson, null, 2));
    } catch (err) {
      Logger.log("STEP 2: parse error => " + err);
      throw new Error("Could not parse finalMsg.content as JSON. Content:\n" + content);
    }
  }

  Logger.log("=== analyzeFlyer() END ===");
  return finalJson;
}


/**
 * Test function.
 * Provide a public flyer image URL and see final JSON in Logs.
 */
function testAnalyzeFlyer(flyerUrl = "https://drive.google.com/uc?export=download&id=14dlwSx8r_uDICBv4QAAIgpVZ2NL-s-QS") {
  Logger.log("=== testAnalyzeFlyer() START ===");
  Logger.log("Using flyerUrl: " + flyerUrl);

  let result;
  try {
    result = analyzeFlyer(flyerUrl);
  } catch (err) {
    Logger.log("Error in testAnalyzeFlyer: " + err);
    throw err;
  }

  Logger.log("testAnalyzeFlyer => typeof result: " + typeof result);
  if (!result) {
    Logger.log("No result object returned from analyzeFlyer");
    return;
  }

  Logger.log("=== Final JSON output below ===");
  Logger.log(JSON.stringify(result, null, 2));
  Logger.log("=== testAnalyzeFlyer() END ===");
}
