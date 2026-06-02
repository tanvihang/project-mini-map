import { useCallback } from "react";
import { useJourney } from "../context/JourneyContext";

const getBrowserLocation = () =>
  new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve([pos.coords.longitude, pos.coords.latitude]);
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      }
    );
  });

/**
 * Custom hook for gateway API calls
 * Encapsulates all backend communication
 */
export function useGateway() {
  const { state, setLoading, setError, setJourney, addDay, setChoices, setUser, setBudget } = useJourney();

  const callGateway = useCallback(
    async (operation, payload) => {
      const url = `${state.apiConfig.apiBase.replace(/\/$/, "")}/api/gateway`;
      const headers = {
        "Content-Type": "application/json",
        "X-Operation-Type": operation,
      };
      if (state.apiConfig.apiKey.trim()) {
        headers["X-Api-Key"] = state.apiConfig.apiKey.trim();
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload ?? {}),
      });

      const traceId = response.headers.get("X-Trace-Id");
      const data = await response.json();

      return { data, status: response.status, traceId };
    },
    [state.apiConfig]
  );

  // User registration
  const register = useCallback(
    async (email, password, displayName = null) => {
      setLoading(true, "注册中...");
      try {
        const payload = {
          email: email.trim(),
          password,
          displayName: displayName?.trim() || null,
        };
        const response = await callGateway("USER_REGISTER", payload);

        if (response.data?.ok && response.data.data?.isSuccess) {
          const { userId, email, displayName } = response.data.data;
          setUser({ userId, email, displayName });
          return { success: true, userId, email, displayName };
        } else {
          const errorData = response.data?.data || response.data;
          return {
            success: false,
            errorCode: errorData?.errorCode,
            message: errorData?.errorMessage || "注册失败",
          };
        }
      } catch (error) {
        return { success: false, message: error.message };
      } finally {
        setLoading(false);
      }
    },
    [callGateway, setLoading, setUser]
  );

  // User login
  const login = useCallback(
    async (email, password) => {
      setLoading(true, "登录中...");
      try {
        const payload = {
          email: email.trim(),
          password,
        };
        const response = await callGateway("USER_LOGIN", payload);

        if (response.data?.ok && response.data.data?.isSuccess) {
          const { userId, email, displayName } = response.data.data;
          setUser({ userId, email, displayName });
          return { success: true, userId, email, displayName };
        }
        const errorData = response.data?.data || response.data;
        return {
          success: false,
          errorCode: errorData?.errorCode,
          message: errorData?.errorMessage || "登录失败",
        };
      } catch (error) {
        return { success: false, message: error.message };
      } finally {
        setLoading(false);
      }
    },
    [callGateway, setLoading, setUser]
  );

  // Start journey
  const startJourney = useCallback(async () => {
    if (!state.user?.userId) {
      return { success: false, message: "请先登录" };
    }
    setLoading(true, "Agent 规划中...");
    try {
      // Use user-provided start location, or fall back to browser location
      let startLocation = null;
      if (state.params.startLocation?.coordinates) {
        // User provided location with coordinates
        startLocation = state.params.startLocation.coordinates;
      } else if (state.params.startLocation?.name) {
        // User provided location name only - pass as object for backend geocoding
        startLocation = { name: state.params.startLocation.name };
      } else {
        // Fall back to browser location
        startLocation = await getBrowserLocation();
      }

      const payload = {
        userId: state.user.userId,
        destination: state.params.destination,
        totalDays: Number(state.params.totalDays),
        totalBudgetMinor: state.params.totalBudgetMinor,
        budgetCurrency: state.params.budgetCurrency,
        travelStyle: state.params.travelStyle,
        interests: state.params.interests,
        startLocation: startLocation,
        startLocationName: state.params.startLocation?.name || null,
      };

      const response = await callGateway("JOURNEY_START", payload);

      if (response.data?.ok) {
        const { journeyId, day, state: journeyState, suggestedWaypoints } = response.data.data;

        setJourney({
          journeyId,
          status: "active",
          currentDay: day?.dayNumber || 1,
          visitedTags: journeyState?.visitedTags || [],
          waypoints: suggestedWaypoints || [],
        });

        if (day) {
          addDay(day);
        }

        if (day?.choices) {
          setChoices(day.choices);
        }

        // Initialize budget tracking
        const totalBudget = parseInt(state.params.totalBudgetMinor, 10);
        setBudget({
          total: totalBudget,
          remaining: journeyState?.remainingBudgetMinor || totalBudget,
          spent: totalBudget - (journeyState?.remainingBudgetMinor || totalBudget),
        });

        return { success: true, journeyId, day, suggestedWaypoints };
      } else {
        return {
          success: false,
          message: response.data?.error || "启动行程失败",
        };
      }
    } catch (error) {
      setError(error.message);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }, [state.user, state.params, callGateway, setLoading, setError, setJourney, addDay, setChoices, setBudget]);

  // Journey list
  const listJourneys = useCallback(
    async (userId) => {
      try {
        const payload = { userId };
        const response = await callGateway("JOURNEY_LIST", payload);
        if (response.data?.ok && response.data.data?.isSuccess) {
          return { success: true, journeys: response.data.data.journeys || [] };
        }
        return {
          success: false,
          message: response.data?.data?.errorMessage || "加载行程失败",
        };
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    [callGateway]
  );

  // Journey detail
  const getJourney = useCallback(
    async (journeyId) => {
      try {
        const payload = { journeyId };
        const response = await callGateway("JOURNEY_GET", payload);
        if (response.data?.ok && response.data.data?.isSuccess) {
          return { success: true, journey: response.data.data.journey };
        }
        return {
          success: false,
          message: response.data?.data?.errorMessage || "加载行程失败",
        };
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    [callGateway]
  );

  // Next day
  const nextDay = useCallback(
    async (chosenIndex) => {
      if (!state.journey.journeyId) {
        return { success: false, message: "请先启动行程" };
      }

      setLoading(true, "生成下一天...");
      try {
        const payload = {
          journeyId: state.journey.journeyId,
          chosenIndex: Number(chosenIndex),
        };

        const response = await callGateway("JOURNEY_NEXT_DAY", payload);

        if (response.data?.ok) {
          const { day } = response.data.data;

          if (day) {
            addDay(day);
          }

          if (day?.choices) {
            setChoices(day.choices);
          }

          // Update budget
          const chosen = state.journey.choices?.[chosenIndex];
          if (chosen?.estimatedCostMinor) {
            const cost = parseInt(chosen.estimatedCostMinor, 10);
            setBudget({
              spent: state.budget.spent + cost,
              remaining: state.budget.remaining - cost,
            });
          }

          return { success: true, day };
        } else {
          return {
            success: false,
            message: response.data?.error || "生成下一天失败",
          };
        }
      } catch (error) {
        setError(error.message);
        return { success: false, message: error.message };
      } finally {
        setLoading(false);
      }
    },
    [state.journey, state.budget, callGateway, setLoading, setError, addDay, setChoices, setBudget]
  );

  // Budget check
  const checkBudget = useCallback(
    async (estimatedCostMinor) => {
      setLoading(true, "检查预算...");
      try {
        const payload = {
          remainingBudgetMinor: String(state.budget.remaining),
          remainingDays: state.params.totalDays - state.journey.currentDay,
          estimatedCostMinor: String(estimatedCostMinor),
          currency: state.params.budgetCurrency,
        };

        const response = await callGateway("BUDGET_CHECK", payload);

        if (response.data?.ok && response.data.data?.isSuccess) {
          return {
            success: true,
            approved: response.data.data.approved,
            threshold: response.data.data.thresholdMinor,
          };
        } else {
          return {
            success: false,
            approved: false,
            errorCode: response.data?.data?.errorCode,
            message: response.data?.data?.errorMessage || "预算超支",
          };
        }
      } catch (error) {
        return { success: false, message: error.message };
      } finally {
        setLoading(false);
      }
    },
    [state.budget, state.params, state.journey, callGateway, setLoading]
  );

  // Geo reachable
  const getReachable = useCallback(
    async (longitude, latitude, maxDistanceMeters = 50000) => {
      try {
        const payload = {
          longitude,
          latitude,
          maxDistanceMeters,
          excludeTags: state.journey.visitedTags || [],
        };

        const response = await callGateway("GEO_REACHABLE", payload);

        if (response.data?.ok && response.data.data?.isSuccess) {
          return {
            success: true,
            candidates: response.data.data.candidates || [],
          };
        } else {
          return {
            success: false,
            message: response.data?.data?.errorMessage || "查询可达地点失败",
          };
        }
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    [state.journey.visitedTags, callGateway]
  );

  // Chat send
  const sendChat = useCallback(
    async (message, sessionId = null) => {
      try {
        const payload = {
          message,
          sessionId,
          journeyId: state.journey.journeyId || null,
        };

        const response = await callGateway("CHAT_SEND", payload);

        if (response.data?.ok) {
          const { sessionId, reply, suggestedActions } = response.data.data;
          return {
            success: true,
            sessionId,
            reply,
            suggestedActions: suggestedActions || [],
          };
        } else {
          return {
            success: false,
            message: "对话失败",
          };
        }
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    [state.journey.journeyId, callGateway]
  );

  // Health ping
  const healthPing = useCallback(async () => {
    try {
      const response = await callGateway("HEALTH_PING", {});
      return {
        success: response.data?.ok,
        data: response.data?.data,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }, [callGateway]);

  // Add waypoint
  const addWaypoint = useCallback(
    async (waypoint) => {
      if (!state.journey.journeyId) {
        return { success: false, message: "请先启动行程" };
      }
      try {
        const payload = {
          journeyId: state.journey.journeyId,
          name: waypoint.name,
          coordinates: waypoint.coordinates,
          betweenDays: waypoint.betweenDays || null,
        };

        const response = await callGateway("WAYPOINT_ADD", payload);

        if (response.data?.ok && response.data.data?.isSuccess) {
          return { success: true, waypoint: response.data.data.waypoint };
        } else {
          return {
            success: false,
            message: response.data?.data?.errorMessage || "添加途经景点失败",
          };
        }
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    [state.journey.journeyId, callGateway]
  );

  // Remove waypoint
  const removeWaypoint = useCallback(
    async (index) => {
      if (!state.journey.journeyId) {
        return { success: false, message: "请先启动行程" };
      }
      try {
        const payload = {
          journeyId: state.journey.journeyId,
          waypointIndex: index,
        };

        const response = await callGateway("WAYPOINT_REMOVE", payload);

        if (response.data?.ok && response.data.data?.isSuccess) {
          return { success: true };
        } else {
          return {
            success: false,
            message: response.data?.data?.errorMessage || "删除途经景点失败",
          };
        }
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    [state.journey.journeyId, callGateway]
  );

  // Suggest waypoints
  const suggestWaypoints = useCallback(
    async (fromDay, toDay) => {
      if (!state.journey.journeyId) {
        return { success: false, message: "请先启动行程" };
      }
      try {
        const payload = {
          journeyId: state.journey.journeyId,
          fromDay,
          toDay,
        };

        const response = await callGateway("WAYPOINT_SUGGEST", payload);

        if (response.data?.ok && response.data.data?.isSuccess) {
          return {
            success: true,
            suggestions: response.data.data.suggestions || [],
          };
        } else {
          return {
            success: false,
            message: response.data?.data?.errorMessage || "获取推荐途经景点失败",
          };
        }
      } catch (error) {
        return { success: false, message: error.message };
      }
    },
    [state.journey.journeyId, callGateway]
  );

  return {
    // Raw gateway call
    callGateway,
    // High-level operations
    register,
    login,
    startJourney,
    nextDay,
    checkBudget,
    getReachable,
    listJourneys,
    getJourney,
    sendChat,
    healthPing,
    // Waypoint operations
    addWaypoint,
    removeWaypoint,
    suggestWaypoints,
  };
}

export default useGateway;