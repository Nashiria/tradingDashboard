"use strict";

const TICKER_TYPES = [
  "Forex",
  "Metals",
  "Shares",
  "Indices",
  "Commodities",
  "Crypto",
];

const isRecord = (value) => typeof value === "object" && value !== null;

const isTickerType = (value) => (
  typeof value === "string" && TICKER_TYPES.includes(value)
);

const isTicker = (value) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.symbol === "string" &&
    typeof value.name === "string" &&
    typeof value.basePrice === "number" &&
    isTickerType(value.type) &&
    typeof value.isFavorite === "boolean" &&
    typeof value.inPortfolio === "boolean" &&
    typeof value.icon === "string"
  );
};

const isTickerWithPrice = (value) => (
  isTicker(value) && typeof value.currentPrice === "number"
);

const isPriceUpdate = (value) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.symbol === "string" &&
    typeof value.price === "number" &&
    typeof value.timestamp === "number"
  );
};

const AUTH_ROLES = [
  "demo",
  "trader",
  "admin",
];

const ALERT_DIRECTIONS = [
  "above",
  "below",
];

const isAuthRole = (value) => (
  typeof value === "string" && AUTH_ROLES.includes(value)
);

const isAuthUser = (value) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.email === "string" &&
    typeof value.name === "string" &&
    isAuthRole(value.role)
  );
};

const isAuthSession = (value) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.token === "string" &&
    typeof value.expiresAt === "number" &&
    isAuthUser(value.user)
  );
};

const isPriceAlert = (value) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.userId === "string" &&
    typeof value.symbol === "string" &&
    typeof value.targetPrice === "number" &&
    ALERT_DIRECTIONS.includes(value.direction) &&
    typeof value.createdAt === "number" &&
    (
      value.triggeredAt === undefined ||
      typeof value.triggeredAt === "number"
    )
  );
};

const isAlertTriggerEvent = (value) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.userId === "string" &&
    typeof value.price === "number" &&
    typeof value.timestamp === "number" &&
    isPriceAlert(value.alert)
  );
};

module.exports = {
  TICKER_TYPES,
  isTickerType,
  isTicker,
  isTickerWithPrice,
  isPriceUpdate,
  isAuthUser,
  isAuthSession,
  isPriceAlert,
  isAlertTriggerEvent,
};
