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

module.exports = {
  TICKER_TYPES,
  isTickerType,
  isTicker,
  isTickerWithPrice,
  isPriceUpdate,
};
