# Mobile App Integration Guide: Team Bell Subscription & Notifications

## 1. Feature Overview
Users can subscribe to their favorite teams by tapping the Bell icon on the Team Page. Subscribed users automatically receive real-time push notifications whenever any event occurs (goals, cards, POTD, clean sheets, full-time match results, player transfers).

---

## 2. API Endpoints Reference

Base URL: `YOUR_API_BASE_URL/api/v1`

| Action | Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Get Team Dashboard** | `GET` | `/team-dashboard/:teamId` | Optional | Returns team info, player list, matches, plus `isSubscribed` & `subscriberCount` |
| **Toggle Subscription** | `POST` | `/team-subscription/toggle` | Required | Toggles bell status (Subscribe / Unsubscribe) |
| **Check Subscription** | `GET` | `/team-subscription/status/:teamId` | Required | Returns if user is subscribed to this team |
| **My Subscribed Teams** | `GET` | `/team-subscription/my-subscriptions` | Required | Returns list of all teams the logged-in user subscribed to |
| **Subscriber Count** | `GET` | `/team-subscription/subscribers-count/:teamId` | No | Returns active subscriber count |

---

## 3. API Details & Payloads

### A. Team Dashboard (Includes Bell Status)
* **Endpoint:** `GET /api/v1/team-dashboard/:teamId`
* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  ```
  *(Note: Header is optional. Pass token in header OR `?userId=<USER_ID>` in query param if logged in. If guest user, omit header; API returns `isSubscribed: false` without throwing 401).*

* **Response:**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Team dashboard retrieved successfully",
    "data": {
      "team": {
        "_id": "66f4d2a1b2c3d4e5f6a7b8c9",
        "teamName": "Manchester Red",
        "shortName": "MNR",
        "teamLogo": "https://example.com/logo.png",
        "city": "Manchester"
      },
      "totalPlayers": 18,
      "players": [...],
      "upcomingMatches": [...],
      "recentMatches": [...],
      "isSubscribed": true,
      "subscriberCount": 142
    }
  }
  ```

---

### B. Toggle Subscription (Bell Click)
* **Endpoint:** `POST /api/v1/team-subscription/toggle`
  *(Alternative URL: `POST /api/v1/team-subscription/toggle/:teamId`)*
* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  Content-Type: application/json
  ```
* **Request Body:**
  ```json
  {
    "teamId": "66f4d2a1b2c3d4e5f6a7b8c9"
  }
  ```
* **Response:**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Subscribed to team notifications successfully",
    "data": {
      "isSubscribed": true,
      "teamId": "66f4d2a1b2c3d4e5f6a7b8c9",
      "subscriberCount": 143
    }
  }
  ```
  *(When unsubscribing, `isSubscribed` will be `false` and message will be `"Unsubscribed from team notifications successfully"`).*

---

### C. Check Subscription Status
* **Endpoint:** `GET /api/v1/team-subscription/status/:teamId`
* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  ```
* **Response:**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Subscription status retrieved successfully",
    "data": {
      "isSubscribed": true,
      "teamId": "66f4d2a1b2c3d4e5f6a7b8c9",
      "subscriberCount": 143
    }
  }
  ```

---

### D. My Subscribed Teams List
* **Endpoint:** `GET /api/v1/team-subscription/my-subscriptions?page=1&limit=20`
* **Headers:**
  ```http
  Authorization: Bearer <TOKEN>
  ```
* **Response:**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Subscribed teams retrieved successfully",
    "data": [
      {
        "_id": "67f102a1b2c3d4e5f6a7b8c9",
        "team": {
          "_id": "66f4d2a1b2c3d4e5f6a7b8c9",
          "teamName": "Manchester Red",
          "teamLogo": "https://example.com/logo.png"
        },
        "isBellActive": true,
        "createdAt": "2026-09-27T10:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPage": 1
    }
  }
  ```

---

## 4. Mobile App UI / UX Implementation

### A. Team Page Load
1. Call `GET /api/v1/team-dashboard/:teamId`.
2. Check `data.isSubscribed`:
   * If `true` -> Show **Active / Filled Bell Icon** (e.g. Gold / Primary Color).
   * If `false` -> Show **Inactive / Outline Bell Icon** (e.g. Gray / Outline).
3. Display `data.subscriberCount` next to the Bell.

### B. User Taps the Bell Icon
1. **Auth Check:** If user is not logged in, prompt Login ("Please sign in to subscribe to team updates").
2. **Optimistic UI:**
   * Invert bell state immediately (`isSubscribed = !isSubscribed`).
   * Update count locally: `subscriberCount += isSubscribed ? 1 : -1`.
   * Add light haptic vibration.
3. **API Call:** Send `POST /api/v1/team-subscription/toggle` with `{ teamId }`.
4. **Error Handling:** If API fails, revert state and counter back to original, show toast error.

---

## 5. Push Notification Payload & Deep Linking

When team events happen, Firebase Cloud Messaging (FCM) sends push notifications with deep link data:

```json
{
  "notification": {
    "title": "Goal Scored",
    "body": "John Doe scored for Manchester Red at minute 24."
  },
  "data": {
    "screen": "TEAM_DETAILS",
    "teamId": "66f4d2a1b2c3d4e5f6a7b8c9",
    "matchId": "6759cd82a1b2c3d4e5f6a7b8",
    "type": "PLAYER_ACTION"
  }
}
```

### Notification Click Action:
* Check `data.screen`:
  * If `data.screen === "TEAM_DETAILS"`, navigate to `TeamDetailsScreen(teamId: data.teamId)`.
  * If `data.matchId` exists and user clicked a match result notification, route to `MatchDetailsScreen(matchId: data.matchId)`.
