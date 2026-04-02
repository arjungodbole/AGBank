import { NextRequest, NextResponse } from "next/server";


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

    const response = await fetch(
      "http://127.0.0.1:8000/scan",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image, denominations }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("CV server error:", response.status, errorBody);
      return NextResponse.json(
        { message: "Failed to scan chips" },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Scan chips error:", err);
    return NextResponse.json(
      { message: "Failed to scan chips" },
      { status: 500 }
    );
  }
}
