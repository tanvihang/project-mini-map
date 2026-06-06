# Mini-Map API — Curl Reference

Base URL: `https://minimap-backend-o4bycaxchq-uc.a.run.app`

---

## 1. HEALTH_PING

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: HEALTH_PING" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 2. USER_REGISTER

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: USER_REGISTER" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","displayName":"Test"}'
```

## 3. USER_LOGIN

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: USER_LOGIN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 4. JOURNEY_START

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: JOURNEY_START" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<user_id>","destination":"Tokyo","totalDays":5,"totalBudgetMinor":"500000","budgetCurrency":"MYR","travelStyle":"adventure","interests":["food","culture"]}'
```

## 5. JOURNEY_NEXT_DAY

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: JOURNEY_NEXT_DAY" \
  -H "Content-Type: application/json" \
  -d '{"journeyId":"<journey_id>","chosenIndex":0}'
```

## 6. JOURNEY_LIST

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: JOURNEY_LIST" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<user_id>"}'
```

## 7. JOURNEY_GET

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: JOURNEY_GET" \
  -H "Content-Type: application/json" \
  -d '{"journeyId":"<journey_id>"}'
```

## 8. BUDGET_CHECK

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: BUDGET_CHECK" \
  -H "Content-Type: application/json" \
  -d '{"remainingBudgetMinor":"100000","remainingDays":5,"estimatedCostMinor":"25000","currency":"MYR"}'
```

## 9. GEO_REACHABLE

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: GEO_REACHABLE" \
  -H "Content-Type: application/json" \
  -d '{"longitude":139.6917,"latitude":35.6895,"maxDistanceMeters":50000,"excludeTags":[],"interestQuery":"food"}'
```

## 10. CHAT_SEND

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: CHAT_SEND" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":null,"journeyId":"<journey_id>","message":"What should I eat near Shibuya?"}'
```

## 11. WAYPOINT_ADD

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: WAYPOINT_ADD" \
  -H "Content-Type: application/json" \
  -d '{"journeyId":"<journey_id>","name":"TeamLab","coordinates":[139.76,35.62],"betweenDays":[1,2]}'
```

## 12. WAYPOINT_REMOVE

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: WAYPOINT_REMOVE" \
  -H "Content-Type: application/json" \
  -d '{"journeyId":"<journey_id>","waypointIndex":0}'
```

## 13. WAYPOINT_SUGGEST

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: WAYPOINT_SUGGEST" \
  -H "Content-Type: application/json" \
  -d '{"journeyId":"<journey_id>","fromDay":1,"toDay":2}'
```

---

## With Gateway Auth Key

If `GATEWAY_API_KEY` is set, add `-H "X-Api-Key: <your-key>"` to every call:

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: HEALTH_PING" \
  -H "X-Api-Key: <your-key>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Pretty-print Output

Pipe through `python3 -m json.tool` for readable JSON:

```bash
curl -s -X POST https://minimap-backend-o4bycaxchq-uc.a.run.app/api/gateway \
  -H "X-Operation-Type: HEALTH_PING" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool
```
