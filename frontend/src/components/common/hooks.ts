import { useState, useCallback } from "react";
import { MessageState } from "./types";

export function useMessage() {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const showMessage = useCallback((msg: string, type: "success" | "error") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3000);
  }, []);

  const clearMessage = useCallback(() => {
    setMessage("");
    setMessageType("");
  }, []);

  return {
    message,
    messageType,
    showMessage,
    clearMessage,
  };
}

export function useLoading(initialState: boolean = false) {
  const [loading, setLoading] = useState(initialState);

  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      const result = await fn();
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    setLoading,
    withLoading,
  };
}

export function useCopyToClipboard() {
  const [copyMessage, setCopyMessage] = useState("");

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("Copied!");
      setTimeout(() => setCopyMessage(""), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      setCopyMessage("Failed to copy");
      setTimeout(() => setCopyMessage(""), 2000);
    }
  }, []);

  return {
    copyMessage,
    copyToClipboard,
  };
}
