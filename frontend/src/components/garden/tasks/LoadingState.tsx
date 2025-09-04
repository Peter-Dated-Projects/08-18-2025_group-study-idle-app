import React from "react";
import { FONTCOLOR, SECONDARY_TEXT, HeaderFont, BodyFont } from "../../constants";

export default function LoadingState() {
  return (
    <div className="h-full flex flex-col justify-center items-center text-center py-16">
      <div className="flex justify-center mb-4">
        {/* You can add a loading spinner here if needed */}
      </div>
      <h3 className="text-lg font-medium mb-2" style={{ fontFamily: HeaderFont, color: FONTCOLOR }}>
        Loading your tasks...
      </h3>
      <p className="text-sm" style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}>
        Please wait while we fetch your study session content
      </p>
    </div>
  );
}
