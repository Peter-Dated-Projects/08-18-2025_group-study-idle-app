import {
  FONTCOLOR,
  BORDERLINE,
  PANELFILL,
  BORDERFILL,
  SUCCESS_COLOR,
  ERROR_COLOR,
  HOVER_COLOR,
} from "../constants";

export const commonStyles = {
  // Button styles
  primaryButton: {
    backgroundColor: BORDERFILL,
    border: `2px solid ${BORDERLINE}`,
    borderRadius: "4px",
    color: FONTCOLOR,
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold" as const,
    transition: "background-color 0.2s",
  },

  secondaryButton: {
    backgroundColor: "transparent",
    border: `2px solid ${BORDERLINE}`,
    borderRadius: "4px",
    color: FONTCOLOR,
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold" as const,
    transition: "background-color 0.2s",
  },

  dangerButton: {
    backgroundColor: ERROR_COLOR,
    border: `2px solid ${ERROR_COLOR}`,
    borderRadius: "4px",
    color: "#ffffff",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold" as const,
    transition: "background-color 0.2s",
  },

  // Input styles
  textInput: {
    width: "100%",
    padding: "8px 12px",
    backgroundColor: PANELFILL,
    border: `2px solid ${BORDERLINE}`,
    borderRadius: "4px",
    color: FONTCOLOR,
    fontSize: "14px",
    outline: "none",
  },

  // Label styles
  label: {
    display: "block" as const,
    color: FONTCOLOR,
    fontSize: "14px",
    fontWeight: "bold" as const,
    marginBottom: "5px",
  },

  // Container styles
  container: {
    padding: "20px",
  },

  centeredContainer: {
    padding: "20px",
    textAlign: "center" as const,
    color: FONTCOLOR,
  },

  // Message styles
  successMessage: {
    padding: "10px 15px",
    backgroundColor: SUCCESS_COLOR,
    color: "#ffffff",
    borderRadius: "4px",
    marginBottom: "15px",
    fontSize: "14px",
    fontWeight: "bold" as const,
  },

  errorMessage: {
    padding: "10px 15px",
    backgroundColor: ERROR_COLOR,
    color: "#ffffff",
    borderRadius: "4px",
    marginBottom: "15px",
    fontSize: "14px",
    fontWeight: "bold" as const,
  },

  // Loading spinner style
  loadingSpinner: {
    display: "inline-block" as const,
    width: "20px",
    height: "20px",
    border: `3px solid ${BORDERLINE}`,
    borderRadius: "50%",
    borderTopColor: "transparent",
    animation: "spin 1s ease-in-out infinite",
  },

  // Profile picture placeholder
  profilePicture: {
    width: "100px",
    height: "100px",
    backgroundColor: BORDERFILL,
    border: `2px solid ${BORDERLINE}`,
    borderRadius: "50%",
    margin: "0 auto 20px auto",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    fontSize: "40px",
    color: FONTCOLOR,
  },

  // Form group
  formGroup: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "15px",
  },

  // Info display
  infoDisplay: {
    padding: "8px 12px",
    backgroundColor: BORDERFILL,
    border: `1px solid ${BORDERLINE}`,
    borderRadius: "4px",
    color: FONTCOLOR,
    fontSize: "14px",
  },
};

// Hover effects
export const hoverEffects = {
  primaryButton: {
    backgroundColor: HOVER_COLOR,
  },

  secondaryButton: {
    backgroundColor: BORDERFILL,
  },

  dangerButton: {
    backgroundColor: "#b84a44",
  },
};
