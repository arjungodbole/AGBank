import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Denomination {
  color: string;
  value: number;
}

export async function POST(request: NextRequest) {
  try {
    const { image, denominations } = (await request.json()) as {
      image: string;
      denominations: Denomination[];
    };

    if (!image || !denominations?.length) {
      return NextResponse.json(
        { message: "Image and denominations are required" },
        { status: 400 }
      );
    }

    // Strip the data URL prefix to get raw base64
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    // Build the denomination list for the prompt
    const denomList = denominations
      .map((d) => `${d.color} = $${d.value}`)
      .join(", ");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: `Count the poker chips in this image by color. The chip denominations are: ${denomList}.

Return ONLY a JSON object with the count of each chip color. Example format:
{"Red": 3, "Blue": 5}

If you cannot identify any chips, return an empty object: {}`,
            },
          ],
        },
      ],
    });

    // Extract the text response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { message: "No response from vision model" },
        { status: 500 }
      );
    }

    // Parse the JSON from Claude's response
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { message: "Could not parse chip counts from response" },
        { status: 500 }
      );
    }

    const counts: Record<string, number> = JSON.parse(jsonMatch[0]);

    // Calculate total by matching counts to denomination values
    let total = 0;
    for (const [color, count] of Object.entries(counts)) {
      const denom = denominations.find(
        (d) => d.color.toLowerCase() === color.toLowerCase()
      );
      if (denom) {
        total += denom.value * count;
      }
    }

    return NextResponse.json({ counts, total });
  } catch (err) {
    console.error("Scan chips error:", err);
    return NextResponse.json(
      { message: "Failed to scan chips" },
      { status: 500 }
    );
  }
}
