import { createContext, useContext, useReducer, useCallback } from "react";

// Initial state
const initialState = {
  // User
  user: null, // { userId, email, displayName }

  // Journey parameters (input)
  params: {
    destination: "",
    totalDays: 4,
    totalBudgetMinor: "300000",
    budgetCurrency: "JPY",
    travelStyle: "slow",
    interests: [],
    startLocation: null, // { name: string, coordinates: [lng, lat] }
  },

  // Journey data (from API)
  journey: {
    journeyId: null,
    status: "idle", // idle | planning | active | completed
    days: [], // array of day objects
    choices: [], // current choices
    currentDay: 0,
    visitedTags: [],
    waypoints: [], // 途经景点列表 [{ name, coordinates, type: 'auto'|'manual', betweenDays: [from, to] }]
  },

  // Budget tracking
  budget: {
    total: 0,
    spent: 0,
    remaining: 0,
    dailyBreakdown: [], // [{ day, cost }]
  },

  // API configuration
  apiConfig: {
    apiBase: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
    apiKey: import.meta.env.VITE_API_KEY || "",
  },

  // UI state
  step: 1, // current step (1-5)
  loading: false,
  loadingMessage: "",
  error: null,
};

// Action types
const ACTIONS = {
  // User
  SET_USER: "SET_USER",
  CLEAR_USER: "CLEAR_USER",

  // Params
  SET_PARAMS: "SET_PARAMS",
  UPDATE_PARAM: "UPDATE_PARAM",

  // Journey
  SET_JOURNEY: "SET_JOURNEY",
  UPDATE_JOURNEY: "UPDATE_JOURNEY",
  ADD_DAY: "ADD_DAY",
  SET_CHOICES: "SET_CHOICES",
  CLEAR_JOURNEY: "CLEAR_JOURNEY",

  // Waypoints
  SET_WAYPOINTS: "SET_WAYPOINTS",
  ADD_WAYPOINT: "ADD_WAYPOINT",
  REMOVE_WAYPOINT: "REMOVE_WAYPOINT",

  // Budget
  SET_BUDGET: "SET_BUDGET",
  UPDATE_BUDGET: "UPDATE_BUDGET",

  // API
  SET_API_CONFIG: "SET_API_CONFIG",

  // UI
  SET_STEP: "SET_STEP",
  NEXT_STEP: "NEXT_STEP",
  PREV_STEP: "PREV_STEP",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
};

// Reducer
function journeyReducer(state, action) {
  switch (action.type) {
    // User
    case ACTIONS.SET_USER:
      return { ...state, user: action.payload };

    case ACTIONS.CLEAR_USER:
      return { ...state, user: null };

    // Params
    case ACTIONS.SET_PARAMS:
      return { ...state, params: { ...state.params, ...action.payload } };

    case ACTIONS.UPDATE_PARAM:
      return {
        ...state,
        params: { ...state.params, [action.payload.key]: action.payload.value },
      };

    // Journey
    case ACTIONS.SET_JOURNEY:
      return {
        ...state,
        journey: { ...state.journey, ...action.payload },
      };

    case ACTIONS.UPDATE_JOURNEY:
      return {
        ...state,
        journey: { ...state.journey, ...action.payload },
      };

    case ACTIONS.ADD_DAY:
      return {
        ...state,
        journey: {
          ...state.journey,
          days: [...state.journey.days, action.payload],
          currentDay: action.payload.dayNumber,
        },
      };

    case ACTIONS.SET_CHOICES:
      return {
        ...state,
        journey: { ...state.journey, choices: action.payload },
      };

    case ACTIONS.CLEAR_JOURNEY:
      return {
        ...state,
        journey: initialState.journey,
        budget: initialState.budget,
        step: 1,
      };

    // Waypoints
    case ACTIONS.SET_WAYPOINTS:
      return {
        ...state,
        journey: { ...state.journey, waypoints: action.payload },
      };

    case ACTIONS.ADD_WAYPOINT:
      return {
        ...state,
        journey: {
          ...state.journey,
          waypoints: [...state.journey.waypoints, action.payload],
        },
      };

    case ACTIONS.REMOVE_WAYPOINT:
      return {
        ...state,
        journey: {
          ...state.journey,
          waypoints: state.journey.waypoints.filter((_, index) => index !== action.payload),
        },
      };

    // Budget
    case ACTIONS.SET_BUDGET:
      return { ...state, budget: { ...state.budget, ...action.payload } };

    case ACTIONS.UPDATE_BUDGET:
      return {
        ...state,
        budget: { ...state.budget, ...action.payload },
      };

    // API
    case ACTIONS.SET_API_CONFIG:
      return {
        ...state,
        apiConfig: { ...state.apiConfig, ...action.payload },
      };

    // UI
    case ACTIONS.SET_STEP:
      return { ...state, step: action.payload };

    case ACTIONS.NEXT_STEP:
      return { ...state, step: Math.min(state.step + 1, 5) };

    case ACTIONS.PREV_STEP:
      return { ...state, step: Math.max(state.step - 1, 1) };

    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload.loading,
        loadingMessage: action.payload.message || "",
      };

    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    case ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    default:
      return state;
  }
}

// Create context
const JourneyContext = createContext(null);

// Provider component
export function JourneyProvider({ children }) {
  const [state, dispatch] = useReducer(journeyReducer, initialState);

  // Action creators
  const setUser = useCallback((user) => {
    dispatch({ type: ACTIONS.SET_USER, payload: user });
  }, []);

  const clearUser = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_USER });
  }, []);

  const setParams = useCallback((params) => {
    dispatch({ type: ACTIONS.SET_PARAMS, payload: params });
  }, []);

  const updateParam = useCallback((key, value) => {
    dispatch({ type: ACTIONS.UPDATE_PARAM, payload: { key, value } });
  }, []);

  const setJourney = useCallback((journey) => {
    dispatch({ type: ACTIONS.SET_JOURNEY, payload: journey });
  }, []);

  const addDay = useCallback((day) => {
    dispatch({ type: ACTIONS.ADD_DAY, payload: day });
  }, []);

  const setChoices = useCallback((choices) => {
    dispatch({ type: ACTIONS.SET_CHOICES, payload: choices });
  }, []);

  const clearJourney = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_JOURNEY });
  }, []);

  const setWaypoints = useCallback((waypoints) => {
    dispatch({ type: ACTIONS.SET_WAYPOINTS, payload: waypoints });
  }, []);

  const addWaypoint = useCallback((waypoint) => {
    dispatch({ type: ACTIONS.ADD_WAYPOINT, payload: waypoint });
  }, []);

  const removeWaypoint = useCallback((index) => {
    dispatch({ type: ACTIONS.REMOVE_WAYPOINT, payload: index });
  }, []);

  const setBudget = useCallback((budget) => {
    dispatch({ type: ACTIONS.SET_BUDGET, payload: budget });
  }, []);

  const updateBudget = useCallback((budget) => {
    dispatch({ type: ACTIONS.UPDATE_BUDGET, payload: budget });
  }, []);

  const setApiConfig = useCallback((config) => {
    dispatch({ type: ACTIONS.SET_API_CONFIG, payload: config });
  }, []);

  const setStep = useCallback((step) => {
    dispatch({ type: ACTIONS.SET_STEP, payload: step });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: ACTIONS.NEXT_STEP });
  }, []);

  const prevStep = useCallback(() => {
    dispatch({ type: ACTIONS.PREV_STEP });
  }, []);

  const setLoading = useCallback((loading, message = "") => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: { loading, message } });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: ACTIONS.SET_ERROR, payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, []);

  const value = {
    state,
    // User actions
    setUser,
    clearUser,
    // Param actions
    setParams,
    updateParam,
    // Journey actions
    setJourney,
    addDay,
    setChoices,
    clearJourney,
    // Waypoint actions
    setWaypoints,
    addWaypoint,
    removeWaypoint,
    // Budget actions
    setBudget,
    updateBudget,
    // API actions
    setApiConfig,
    // UI actions
    setStep,
    nextStep,
    prevStep,
    setLoading,
    setError,
    clearError,
  };

  return (
    <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>
  );
}

// Custom hook to use the context
export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error("useJourney must be used within a JourneyProvider");
  }
  return context;
}

export default JourneyContext;