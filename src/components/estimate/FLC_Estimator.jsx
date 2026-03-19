import React, { useState, useRef, useEffect } from "react";

// ─── CONFIGURATION ───────────────────────────────────────────────
// Central config for all rates, thresholds, and magic numbers.
// Update here annually or when business rules change.
var CONFIG = {
 MILEAGE_RATE: 1.00,          // $/mile (covers truck + trailer overhead; IRS std is ~$0.70)
 BASE_MOB_OPTIONS: [900, 1200, 1500],
 CREW_DAY_RATE: 3600,         // $/crew-day for margin check (includes 80% margin)
 CREW_DAY_COST: 720,          // actual labor cost per crew-day ($3600 × 20%)
 // Mobilization actual cost inputs
 AVG_DRIVE_SPEED: 55,         // mph average for drive time estimation
 DRIVER_RATE: 20,             // $/hr for lead/driver
 PASSENGER_RATE: 10,          // $/hr per passenger (3 passengers)
 PASSENGER_COUNT: 3,          // passengers per truck (not counting driver)
 TRUCK_MPG: 15,               // miles per gallon (truck + trailer)
 DIESEL_PRICE: 4.00,          // $/gallon diesel (set conservatively)
 CREW_SIZE: 4,                // 1 lead + 3 techs per crew
 PER_DIEM_THRESHOLD: 21,      // days before per diem kicks in
 DEFAULT_PER_DIEM: 120,       // fallback $/day if city not matched

 // Exterior power wash rates by SF tier (v4 granular bands)
 EXT_BANDS: [[100000,999999,0.17],[90000,99999,0.19],[80000,89999,0.21],[70000,79999,0.23],[60000,69999,0.25],[0,59999,0.30]],
 EXT_TIRE_ADDON: 0.07,

 // Window cleaning rates (v4 five-tier system)
 WIN_TIERS: { floor: 30, standard: 37, stretch: 48, luxury: 66, hotel: 26 },

 // SF-based production rate (SF per person-day) by build type complexity
 // Used with (crews × CREW_SIZE) to estimate calendar days
 PROD_RATES: {
  gas_station: 2500,
  small_retail: 2200,
  restaurant: 1800,
  renovation: 1600,
  event_center: 2800,
  fire: 2800,
  police: 2600,
  muni_admin: 2600,
  gym: 2800,
  dealership: 2400,
  big_box: 3500,
  industrial: 4000,
  university: 2600,
  hospital: 2200,
  outpatient: 2200,
  jail: 2000,
  courthouse: 2200, data_center: 1800, luxury_hotel: 2000,
  hotel_select: 2200, luxury_resi: 1600, multi_family: 2800,
  senior_living: 2400, office: 2600, religious: 2600, entertainment: 2200
 }
};
// ─── END CONFIGURATION ───────────────────────────────────────────

var BLU = "#1B3A5C";
var ACC = "#2E75B6";
var LT = "#E8F0FE";
var TIERS = ["70%", "75%", "Floor", "BLU Standard", "Stretch", "Luxury"];
var SN = ["Project", "Drawings", "Review", "Pricing", "Output"];
var HLat = 32.9465;
var HLng = -96.2288;
var P = {
 gas_station: { name: "Gas Station / C-Store", note: "Final only std, windows incl", stages: {
  1: [[1500,2499,1.13,1.36,1.70,2.04,2.72,3.74],[2500,3499,1.03,1.24,1.55,1.86,2.48,3.41],[3500,4999,0.93,1.12,1.40,1.68,2.24,3.08],[5000,9999,0.83,1.00,1.25,1.50,2.00,2.75],[10000,999999,0.73,0.88,1.10,1.32,1.76,2.42]],
  2: [[1500,2499,1.69,2.04,2.55,3.06,4.08,5.61],[2500,3499,1.54,1.86,2.32,2.79,3.72,5.11],[3500,4999,1.39,1.68,2.10,2.52,3.36,4.62],[5000,9999,1.24,1.50,1.87,2.25,3.00,4.12],[10000,999999,1.09,1.32,1.65,1.98,2.64,3.63]]
 } },
 dealership: { name: "Dealership", note: "Windows incl ≤39,999 SF", stages: {
  1: [[15000,24999,0.41,0.50,0.62,0.75,1.00,1.37],[25000,39999,0.40,0.48,0.60,0.72,0.96,1.32],[40000,74999,0.36,0.44,0.55,0.66,0.88,1.21],[75000,999999,0.35,0.42,0.52,0.63,0.84,1.15]],
  2: [[15000,24999,0.62,0.75,0.94,1.13,1.51,2.07],[25000,39999,0.60,0.72,0.90,1.08,1.44,1.98],[40000,74999,0.55,0.66,0.82,0.99,1.32,1.81],[75000,999999,0.53,0.63,0.79,0.95,1.27,1.74]],
  3: [[15000,24999,0.83,1.00,1.25,1.50,2.00,2.75],[25000,39999,0.80,0.96,1.20,1.44,1.92,2.64],[40000,74999,0.73,0.88,1.10,1.32,1.76,2.42],[75000,999999,0.70,0.84,1.05,1.26,1.68,2.31]],
  4: [[15000,24999,1.08,1.30,1.62,1.95,2.60,3.57],[25000,39999,1.03,1.25,1.56,1.87,2.49,3.43],[40000,74999,0.95,1.15,1.43,1.72,2.29,3.15],[75000,999999,0.91,1.09,1.37,1.64,2.19,3.01]]
 } },
 gym: { name: "Gym / Fitness", note: "Windows incl ≤30k SF", stages: {
  1: [[15000,19999,0.29,0.35,0.44,0.53,0.71,0.97],[20000,29999,0.27,0.33,0.41,0.49,0.65,0.90],[30000,39999,0.25,0.31,0.38,0.46,0.61,0.84],[40000,49999,0.25,0.30,0.37,0.45,0.60,0.82],[50000,60000,0.24,0.29,0.37,0.44,0.59,0.81]],
  2: [[15000,19999,0.44,0.53,0.67,0.80,1.07,1.47],[20000,29999,0.41,0.49,0.62,0.74,0.99,1.36],[30000,39999,0.38,0.46,0.57,0.69,0.92,1.26],[40000,49999,0.38,0.45,0.57,0.68,0.91,1.25],[50000,60000,0.36,0.44,0.55,0.66,0.88,1.21]],
  3: [[15000,19999,0.59,0.71,0.88,1.06,1.41,1.94],[20000,29999,0.54,0.65,0.82,0.98,1.31,1.80],[30000,39999,0.51,0.61,0.77,0.92,1.23,1.69],[40000,49999,0.50,0.60,0.75,0.90,1.20,1.65],[50000,60000,0.49,0.59,0.73,0.88,1.17,1.61]],
  4: [[15000,19999,0.76,0.92,1.15,1.38,1.84,2.53],[20000,29999,0.70,0.85,1.06,1.27,1.69,2.33],[30000,39999,0.66,0.80,1.00,1.20,1.60,2.20],[40000,49999,0.65,0.78,0.97,1.17,1.56,2.14],[50000,60000,0.63,0.76,0.95,1.14,1.52,2.09]]
 } },
 hospital: { name: "Hospital / Health Campus", note: "Windows usually separate", stages: {
  1: [[15000,60000,0.40,0.48,0.60,0.72,0.96,1.32],[150000,300000,0.35,0.42,0.52,0.63,0.84,1.15],[300000,500000,0.32,0.38,0.47,0.57,0.76,1.04],[500000,999999,0.30,0.36,0.45,0.54,0.72,0.99]],
  2: [[15000,60000,0.60,0.72,0.90,1.08,1.44,1.98],[150000,300000,0.53,0.63,0.79,0.95,1.27,1.74],[300000,500000,0.48,0.57,0.72,0.86,1.15,1.58],[500000,999999,0.45,0.54,0.67,0.81,1.08,1.48]],
  3: [[15000,60000,0.80,0.96,1.20,1.44,1.92,2.64],[150000,300000,0.70,0.84,1.05,1.26,1.68,2.31],[300000,500000,0.63,0.76,0.95,1.14,1.52,2.09],[500000,999999,0.60,0.72,0.90,1.08,1.44,1.98]],
  4: [[15000,60000,1.03,1.25,1.56,1.87,2.49,3.43],[150000,300000,0.91,1.09,1.37,1.64,2.19,3.01],[300000,500000,0.82,0.99,1.23,1.48,1.97,2.71],[500000,999999,0.77,0.93,1.17,1.40,1.87,2.57]]
 } },
 big_box: { name: "Big-Box Retail", note: "Windows usually separate", stages: {
  1: [[30000,60000,0.30,0.36,0.45,0.54,0.72,0.99],[90000,140000,0.27,0.33,0.41,0.49,0.65,0.90],[150000,999999,0.27,0.32,0.40,0.48,0.64,0.88]],
  2: [[30000,60000,0.45,0.54,0.67,0.81,1.08,1.48],[90000,140000,0.41,0.49,0.62,0.74,0.99,1.36],[150000,999999,0.39,0.47,0.59,0.71,0.95,1.30]],
  3: [[30000,60000,0.60,0.72,0.90,1.08,1.44,1.98],[90000,140000,0.54,0.65,0.82,0.98,1.31,1.80],[150000,999999,0.53,0.63,0.79,0.95,1.27,1.74]],
  4: [[30000,60000,0.77,0.93,1.17,1.40,1.87,2.57],[90000,140000,0.70,0.85,1.06,1.27,1.69,2.33],[150000,999999,0.68,0.82,1.02,1.23,1.64,2.25]]
 } },
 university: { name: "University / Education", note: "Windows usually separate", stages: {
  1: [[30000,69999,0.35,0.42,0.52,0.63,0.84,1.15],[70000,119999,0.33,0.39,0.49,0.59,0.79,1.08],[120000,999999,0.30,0.37,0.46,0.55,0.73,1.01]],
  2: [[30000,69999,0.53,0.63,0.79,0.95,1.27,1.74],[70000,119999,0.49,0.59,0.74,0.89,1.19,1.63],[120000,999999,0.46,0.55,0.69,0.83,1.11,1.52]],
  3: [[30000,69999,0.70,0.84,1.05,1.26,1.68,2.31],[70000,119999,0.65,0.79,0.98,1.18,1.57,2.16],[120000,999999,0.61,0.73,0.92,1.10,1.47,2.02]],
  4: [[30000,69999,0.91,1.09,1.37,1.64,2.19,3.01],[70000,119999,0.85,1.02,1.27,1.53,2.04,2.80],[120000,999999,0.79,0.95,1.19,1.43,1.91,2.62]]
 } },
 jail: { name: "Municipal — Jails / Detention", note: "Windows separate, escort overhead", stages: {
  1: [[25000,45000,0.41,0.50,0.62,0.75,1.00,1.37],[50000,100000,0.36,0.44,0.55,0.66,0.88,1.21],[120000,230000,0.33,0.40,0.50,0.60,0.80,1.10],[250000,999999,0.30,0.37,0.46,0.55,0.73,1.01]],
  2: [[25000,45000,0.62,0.75,0.94,1.13,1.51,2.07],[50000,100000,0.55,0.66,0.82,0.99,1.32,1.81],[120000,230000,0.50,0.60,0.75,0.90,1.20,1.65],[250000,999999,0.46,0.55,0.69,0.83,1.11,1.52]],
  3: [[25000,45000,0.83,1.00,1.25,1.50,2.00,2.75],[50000,100000,0.73,0.88,1.10,1.32,1.76,2.42],[120000,230000,0.66,0.80,1.00,1.20,1.60,2.20],[250000,999999,0.61,0.73,0.92,1.10,1.47,2.02]],
  4: [[25000,45000,1.08,1.30,1.62,1.95,2.60,3.57],[50000,100000,0.95,1.15,1.43,1.72,2.29,3.15],[120000,230000,0.86,1.04,1.30,1.56,2.08,2.86],[250000,999999,0.79,0.95,1.19,1.43,1.91,2.62]]
 } },
 police: { name: "Municipal — Police Stations", note: "Windows separate, secure areas", stages: {
  1: [[15000,24999,0.35,0.42,0.52,0.63,0.84,1.15],[25000,60000,0.32,0.38,0.47,0.57,0.76,1.04],[60000,999999,0.30,0.36,0.45,0.54,0.72,0.99]],
  2: [[15000,24999,0.53,0.63,0.79,0.95,1.27,1.74],[25000,60000,0.48,0.57,0.72,0.86,1.15,1.58],[60000,999999,0.45,0.54,0.67,0.81,1.08,1.48]],
  3: [[15000,24999,0.70,0.84,1.05,1.26,1.68,2.31],[25000,60000,0.63,0.76,0.95,1.14,1.52,2.09],[60000,999999,0.60,0.72,0.90,1.08,1.44,1.98]],
  4: [[15000,24999,0.91,1.09,1.37,1.64,2.19,3.01],[25000,60000,0.82,0.99,1.23,1.48,1.97,2.71],[60000,999999,0.77,0.93,1.17,1.40,1.87,2.57]]
 } },
 fire: { name: "Municipal — Fire Stations", note: "Windows separate, apparatus bays", stages: {
  1: [[7000,12000,0.32,0.38,0.47,0.57,0.76,1.04],[15000,25000,0.29,0.35,0.44,0.53,0.71,0.97],[25000,999999,0.27,0.33,0.41,0.49,0.65,0.90]],
  2: [[7000,12000,0.48,0.57,0.72,0.86,1.15,1.58],[15000,25000,0.44,0.53,0.67,0.80,1.07,1.47],[25000,999999,0.41,0.49,0.62,0.74,0.99,1.36]],
  3: [[7000,12000,0.63,0.76,0.95,1.14,1.52,2.09],[15000,25000,0.59,0.71,0.88,1.06,1.41,1.94],[25000,999999,0.54,0.65,0.82,0.98,1.31,1.80]],
  4: [[7000,12000,0.82,0.99,1.23,1.48,1.97,2.71],[15000,25000,0.76,0.92,1.15,1.38,1.84,2.53],[25000,999999,0.70,0.85,1.06,1.27,1.69,2.33]]
 } },
 courthouse: { name: "Municipal — Courthouses", note: "Windows separate, high-finish", stages: {
  1: [[60000,120000,0.36,0.44,0.55,0.66,0.88,1.21],[120000,250000,0.33,0.40,0.50,0.60,0.80,1.10],[250000,999999,0.32,0.38,0.47,0.57,0.76,1.04]],
  2: [[60000,120000,0.55,0.66,0.82,0.99,1.32,1.81],[120000,250000,0.50,0.60,0.75,0.90,1.20,1.65],[250000,999999,0.48,0.57,0.72,0.86,1.15,1.58]],
  3: [[60000,120000,0.73,0.88,1.10,1.32,1.76,2.42],[120000,250000,0.66,0.80,1.00,1.20,1.60,2.20],[250000,999999,0.63,0.76,0.95,1.14,1.52,2.09]],
  4: [[60000,120000,0.95,1.15,1.43,1.72,2.29,3.15],[120000,250000,0.86,1.04,1.30,1.56,2.08,2.86],[250000,999999,0.82,0.99,1.23,1.48,1.97,2.71]]
 } },
 muni_admin: { name: "Municipal Admin — City Hall", note: "Windows separate", stages: {
  1: [[20000,49999,0.33,0.39,0.49,0.59,0.79,1.08],[50000,99999,0.30,0.37,0.46,0.55,0.73,1.01],[100000,200000,0.29,0.35,0.44,0.53,0.71,0.97]],
  2: [[20000,49999,0.49,0.59,0.74,0.89,1.19,1.63],[50000,99999,0.46,0.55,0.69,0.83,1.11,1.52],[100000,200000,0.44,0.53,0.67,0.80,1.07,1.47]],
  3: [[20000,49999,0.65,0.79,0.98,1.18,1.57,2.16],[50000,99999,0.61,0.73,0.92,1.10,1.47,2.02],[100000,200000,0.59,0.71,0.88,1.06,1.41,1.94]],
  4: [[20000,49999,0.85,1.02,1.27,1.53,2.04,2.80],[50000,99999,0.79,0.95,1.19,1.43,1.91,2.62],[100000,200000,0.76,0.92,1.15,1.38,1.84,2.53]]
 } },
 event_center: { name: "Municipal Event Center", note: "Windows separate, multi-purpose", stages: {
  1: [[2000,4999,0.56,0.68,0.85,1.02,1.36,1.87],[5000,9999,0.48,0.58,0.72,0.87,1.16,1.59],[10000,14999,0.43,0.52,0.65,0.78,1.04,1.43],[15000,19999,0.40,0.48,0.60,0.72,0.96,1.32],[20000,24999,0.37,0.45,0.56,0.67,0.89,1.23],[25000,30000,0.35,0.42,0.52,0.63,0.84,1.15]],
  2: [[2000,4999,0.85,1.02,1.27,1.53,2.04,2.80],[5000,9999,0.72,0.87,1.09,1.31,1.75,2.40],[10000,14999,0.65,0.78,0.97,1.17,1.56,2.14],[15000,19999,0.60,0.72,0.90,1.08,1.44,1.98],[20000,24999,0.56,0.67,0.84,1.01,1.35,1.85],[25000,30000,0.53,0.63,0.79,0.95,1.27,1.74]],
  3: [[2000,4999,1.13,1.36,1.70,2.04,2.72,3.74],[5000,9999,0.96,1.16,1.45,1.74,2.32,3.19],[10000,14999,0.86,1.04,1.30,1.56,2.08,2.86],[15000,19999,0.80,0.96,1.20,1.44,1.92,2.64],[20000,24999,0.74,0.89,1.12,1.34,1.79,2.46],[25000,30000,0.70,0.84,1.05,1.26,1.68,2.31]],
  4: [[2000,4999,1.47,1.77,2.21,2.65,3.53,4.86],[5000,9999,1.25,1.51,1.88,2.26,3.01,4.14],[10000,14999,1.12,1.35,1.69,2.03,2.71,3.72],[15000,19999,1.03,1.25,1.56,1.87,2.49,3.43],[20000,24999,0.96,1.16,1.45,1.74,2.32,3.19],[25000,30000,0.91,1.09,1.37,1.64,2.19,3.01]]
 } },
 outpatient: { name: "Outpatient / Clinic / MOB", note: "Windows separate, infection-control", stages: {
  1: [[10000,24999,0.45,0.54,0.67,0.81,1.08,1.48],[25000,49999,0.40,0.48,0.60,0.72,0.96,1.32],[50000,100000,0.35,0.42,0.52,0.63,0.84,1.15]],
  2: [[10000,24999,0.67,0.81,1.02,1.22,1.63,2.24],[25000,49999,0.60,0.72,0.90,1.08,1.44,1.98],[50000,100000,0.53,0.63,0.79,0.95,1.27,1.74]],
  3: [[10000,24999,0.90,1.08,1.35,1.62,2.16,2.97],[25000,49999,0.80,0.96,1.20,1.44,1.92,2.64],[50000,100000,0.70,0.84,1.05,1.26,1.68,2.31]],
  4: [[10000,24999,1.17,1.41,1.76,2.11,2.81,3.87],[25000,49999,1.03,1.25,1.56,1.87,2.49,3.43],[50000,100000,0.91,1.09,1.37,1.64,2.19,3.01]]
 } },
 restaurant: { name: "Restaurant / Foodservice TI", note: "Windows incl if reachable", stages: {
  1: [[2000,4999,0.80,0.96,1.20,1.44,1.92,2.64],[5000,9999,0.66,0.80,1.00,1.20,1.60,2.20],[10000,20000,0.56,0.68,0.85,1.02,1.36,1.87]],
  2: [[2000,4999,1.19,1.44,1.80,2.16,2.88,3.96],[5000,9999,1.00,1.20,1.50,1.80,2.40,3.30],[10000,20000,0.85,1.02,1.27,1.53,2.04,2.80]],
  3: [[2000,4999,1.59,1.92,2.40,2.88,3.84,5.28],[5000,9999,1.33,1.60,2.00,2.40,3.20,4.40],[10000,20000,1.13,1.36,1.70,2.04,2.72,3.74]],
  4: [[2000,4999,2.07,2.49,3.12,3.74,4.99,6.86],[5000,9999,1.73,2.08,2.60,3.12,4.16,5.72],[10000,20000,1.47,1.77,2.21,2.65,3.53,4.86]]
 } },
 small_retail: { name: "Small Retail TI", note: "Windows incl if storefront", stages: {
  1: [[2000,4999,0.50,0.60,0.75,0.90,1.20,1.65],[5000,9999,0.41,0.50,0.62,0.75,1.00,1.37],[10000,19999,0.36,0.44,0.55,0.66,0.88,1.21]],
  2: [[2000,4999,0.75,0.90,1.12,1.35,1.80,2.47],[5000,9999,0.62,0.75,0.94,1.13,1.51,2.07],[10000,19999,0.55,0.66,0.82,0.99,1.32,1.81]],
  3: [[2000,4999,1.00,1.20,1.50,1.80,2.40,3.30],[5000,9999,0.83,1.00,1.25,1.50,2.00,2.75],[10000,19999,0.73,0.88,1.10,1.32,1.76,2.42]],
  4: [[2000,4999,1.29,1.56,1.95,2.34,3.12,4.29],[5000,9999,1.08,1.30,1.62,1.95,2.60,3.57],[10000,19999,0.95,1.15,1.43,1.72,2.29,3.15]]
 } },
 industrial: { name: "Light Industrial / Warehouse", note: "Windows separate, large bays", stages: {
  1: [[50000,99999,0.27,0.32,0.40,0.48,0.64,0.88],[100000,249999,0.24,0.29,0.36,0.43,0.57,0.79],[250000,499999,0.22,0.26,0.32,0.39,0.52,0.71],[500000,999999,0.20,0.24,0.30,0.36,0.48,0.66]],
  2: [[50000,99999,0.40,0.48,0.60,0.72,0.96,1.32],[100000,249999,0.36,0.43,0.54,0.65,0.87,1.19],[250000,499999,0.33,0.39,0.49,0.59,0.79,1.08],[500000,999999,0.30,0.36,0.45,0.54,0.72,0.99]],
  3: [[50000,99999,0.53,0.64,0.80,0.96,1.28,1.76],[100000,249999,0.48,0.57,0.72,0.86,1.15,1.58],[250000,499999,0.43,0.52,0.65,0.78,1.04,1.43],[500000,999999,0.40,0.48,0.60,0.72,0.96,1.32]],
  4: [[50000,99999,0.69,0.83,1.04,1.25,1.67,2.29],[100000,249999,0.62,0.75,0.93,1.12,1.49,2.05],[250000,499999,0.56,0.67,0.84,1.01,1.35,1.85],[500000,999999,0.52,0.63,0.78,0.94,1.25,1.72]]
 } },
 renovation: { name: "Renovation Cleaning", note: "Windows separate, occupied/phased", stages: {
  1: [[1000,1999,1.00,1.20,1.50,1.80,2.40,3.30],[2000,3999,0.80,0.96,1.20,1.44,1.92,2.64],[4000,5999,0.70,0.84,1.05,1.26,1.68,2.31],[6000,7999,0.63,0.76,0.95,1.14,1.52,2.09],[8000,9999,0.58,0.70,0.87,1.05,1.40,1.92],[10000,14999,0.51,0.62,0.77,0.93,1.24,1.70],[15000,19999,0.46,0.56,0.70,0.84,1.12,1.54],[20000,24999,0.43,0.51,0.64,0.77,1.03,1.41],[25000,29999,0.40,0.48,0.60,0.72,0.96,1.32],[30000,34999,0.37,0.45,0.56,0.67,0.89,1.23],[35000,40000,0.35,0.42,0.52,0.63,0.84,1.15]],
  2: [[1000,1999,1.49,1.80,2.25,2.70,3.60,4.95],[2000,3999,1.19,1.44,1.80,2.16,2.88,3.96],[4000,5999,1.05,1.26,1.57,1.89,2.52,3.46],[6000,7999,0.95,1.14,1.42,1.71,2.28,3.13],[8000,9999,0.87,1.05,1.32,1.58,2.11,2.90],[10000,14999,0.77,0.93,1.17,1.40,1.87,2.57],[15000,19999,0.70,0.84,1.05,1.26,1.68,2.31],[20000,24999,0.64,0.77,0.97,1.16,1.55,2.13],[25000,29999,0.60,0.72,0.90,1.08,1.44,1.98],[30000,34999,0.56,0.67,0.84,1.01,1.35,1.85],[35000,40000,0.53,0.63,0.79,0.95,1.27,1.74]],
  3: [[1000,1999,1.99,2.40,3.00,3.60,4.80,6.60],[2000,3999,1.59,1.92,2.40,2.88,3.84,5.28],[4000,5999,1.39,1.68,2.10,2.52,3.36,4.62],[6000,7999,1.26,1.52,1.90,2.28,3.04,4.18],[8000,9999,1.16,1.40,1.75,2.10,2.80,3.85],[10000,14999,1.03,1.24,1.55,1.86,2.48,3.41],[15000,19999,0.93,1.12,1.40,1.68,2.24,3.08],[20000,24999,0.85,1.03,1.28,1.54,2.05,2.82],[25000,29999,0.80,0.96,1.20,1.44,1.92,2.64],[30000,34999,0.74,0.89,1.12,1.34,1.79,2.46],[35000,40000,0.70,0.84,1.05,1.26,1.68,2.31]]
 } },
 data_center: { name: "Data Center", note: "3-stage + progressive standard, HEPA required", stages: {
  1: [[10000,24999,1.33,1.60,2.00,2.40,3.20,4.40],[25000,49999,1.22,1.47,1.83,2.20,2.93,4.03],[50000,99999,1.13,1.37,1.71,2.05,2.73,3.76],[100000,199999,1.07,1.29,1.61,1.93,2.57,3.54],[200000,399999,0.98,1.19,1.48,1.78,2.37,3.26],[400000,999999,0.93,1.12,1.40,1.68,2.24,3.08]],
  2: [[10000,24999,1.99,2.40,3.00,3.60,4.80,6.60],[25000,49999,1.82,2.20,2.75,3.30,4.40,6.05],[50000,99999,1.70,2.05,2.57,3.08,4.11,5.65],[100000,199999,1.60,1.93,2.41,2.89,3.85,5.30],[200000,399999,1.48,1.78,2.22,2.67,3.56,4.89],[400000,999999,1.39,1.67,2.09,2.51,3.35,4.60]],
  3: [[10000,24999,2.65,3.20,4.00,4.80,6.40,8.80],[25000,49999,2.43,2.93,3.67,4.40,5.87,8.07],[50000,99999,2.27,2.73,3.42,4.10,5.47,7.52],[100000,199999,2.13,2.57,3.21,3.85,5.13,7.06],[200000,399999,1.97,2.37,2.97,3.56,4.75,6.53],[400000,999999,1.85,2.23,2.79,3.35,4.47,6.14]],
  4: [[10000,24999,3.45,4.16,5.20,6.24,8.32,11.44],[25000,49999,3.16,3.82,4.76,5.72,7.62,10.48],[50000,99999,2.95,3.56,4.44,5.33,7.10,9.77],[100000,199999,2.77,3.34,4.17,5.01,6.68,9.18],[200000,399999,2.56,3.09,3.86,4.63,6.17,8.49],[400000,999999,2.41,2.91,3.63,4.36,5.81,7.99]]
 } },
 luxury_hotel: { name: "Luxury Hotel / Condo", note: "VIP +$0.45/SF add-on, ext windows $26/pane", stages: {
  1: [[25000,49999,0.74,0.89,1.11,1.33,1.77,2.44],[50000,99999,0.69,0.83,1.04,1.25,1.67,2.29],[100000,199999,0.66,0.80,1.00,1.20,1.60,2.20],[200000,399999,0.62,0.75,0.94,1.13,1.51,2.07],[400000,999999,0.59,0.71,0.89,1.07,1.43,1.96]],
  2: [[25000,49999,1.11,1.33,1.67,2.00,2.67,3.67],[50000,99999,1.04,1.25,1.57,1.88,2.51,3.45],[100000,199999,1.00,1.20,1.50,1.80,2.40,3.30],[200000,399999,0.93,1.13,1.41,1.69,2.25,3.10],[400000,999999,0.89,1.07,1.34,1.61,2.15,2.95]],
  3: [[25000,49999,1.47,1.77,2.22,2.66,3.55,4.88],[50000,99999,1.38,1.67,2.08,2.50,3.33,4.58],[100000,199999,1.33,1.60,2.00,2.40,3.20,4.40],[200000,399999,1.25,1.51,1.88,2.26,3.01,4.14],[400000,999999,1.18,1.43,1.78,2.14,2.85,3.92]],
  4: [[25000,49999,1.91,2.31,2.88,3.46,4.61,6.34],[50000,99999,1.80,2.17,2.71,3.25,4.33,5.96],[100000,199999,1.73,2.08,2.60,3.12,4.16,5.72],[200000,399999,1.63,1.96,2.45,2.94,3.92,5.39],[400000,999999,1.54,1.85,2.32,2.78,3.71,5.10]]
 } },
 hotel_select: { name: "Hotel (Select / Limited)", note: "VIP +$0.35/SF, ext windows $26/pane", stages: {
  1: [[30000,49999,0.50,0.60,0.75,0.90,1.20,1.65],[50000,79999,0.45,0.55,0.68,0.82,1.09,1.50],[80000,119999,0.41,0.50,0.62,0.75,1.00,1.37],[120000,179999,0.39,0.47,0.58,0.70,0.93,1.28],[180000,999999,0.36,0.44,0.55,0.66,0.88,1.21]],
  2: [[30000,49999,0.75,0.90,1.12,1.35,1.80,2.47],[50000,79999,0.68,0.82,1.02,1.23,1.64,2.25],[80000,119999,0.62,0.75,0.94,1.13,1.51,2.07],[120000,179999,0.58,0.70,0.87,1.05,1.40,1.92],[180000,999999,0.55,0.66,0.82,0.99,1.32,1.81]],
  3: [[30000,49999,1.00,1.20,1.50,1.80,2.40,3.30],[50000,79999,0.91,1.09,1.37,1.64,2.19,3.01],[80000,119999,0.83,1.00,1.25,1.50,2.00,2.75],[120000,179999,0.77,0.93,1.17,1.40,1.87,2.57],[180000,999999,0.73,0.88,1.10,1.32,1.76,2.42]],
  4: [[30000,49999,1.29,1.56,1.95,2.34,3.12,4.29],[50000,79999,1.18,1.42,1.77,2.13,2.84,3.90],[80000,119999,1.08,1.30,1.62,1.95,2.60,3.57],[120000,179999,1.01,1.21,1.52,1.82,2.43,3.34],[180000,999999,0.95,1.15,1.43,1.72,2.29,3.15]]
 } },
 luxury_resi: { name: "Luxury Residential / Custom Home", note: "Windows incl ≤8k SF", stages: {
  1: [[3000,4999,0.88,1.07,1.33,1.60,2.13,2.93],[5000,7999,0.80,0.96,1.20,1.44,1.92,2.64],[8000,11999,0.72,0.87,1.08,1.30,1.73,2.38],[12000,19999,0.66,0.80,1.00,1.20,1.60,2.20],[20000,999999,0.61,0.73,0.92,1.10,1.47,2.02]],
  2: [[3000,4999,1.33,1.60,2.00,2.40,3.20,4.40],[5000,7999,1.19,1.44,1.80,2.16,2.88,3.96],[8000,11999,1.08,1.30,1.62,1.95,2.60,3.57],[12000,19999,1.00,1.20,1.50,1.80,2.40,3.30],[20000,999999,0.91,1.10,1.37,1.65,2.20,3.02]],
  3: [[3000,4999,1.77,2.13,2.67,3.20,4.27,5.87],[5000,7999,1.59,1.92,2.40,2.88,3.84,5.28],[8000,11999,1.44,1.73,2.17,2.60,3.47,4.77],[12000,19999,1.33,1.60,2.00,2.40,3.20,4.40],[20000,999999,1.22,1.47,1.83,2.20,2.93,4.03]],
  4: [[3000,4999,2.30,2.77,3.47,4.16,5.55,7.63],[5000,7999,2.07,2.49,3.12,3.74,4.99,6.86],[8000,11999,1.87,2.25,2.82,3.38,4.51,6.20],[12000,19999,1.73,2.08,2.60,3.12,4.16,5.72],[20000,999999,1.58,1.91,2.38,2.86,3.81,5.24]]
 } },
 multi_family: { name: "Multi-Family Residential", note: "Windows separate, repetitive units", stages: {
  1: [[50000,99999,0.35,0.42,0.52,0.63,0.84,1.15],[100000,199999,0.32,0.38,0.47,0.57,0.76,1.04],[200000,399999,0.29,0.35,0.43,0.52,0.69,0.95],[400000,999999,0.27,0.32,0.40,0.48,0.64,0.88]],
  2: [[50000,99999,0.53,0.63,0.79,0.95,1.27,1.74],[100000,199999,0.48,0.57,0.72,0.86,1.15,1.58],[200000,399999,0.43,0.52,0.65,0.78,1.04,1.43],[400000,999999,0.40,0.48,0.60,0.72,0.96,1.32]],
  3: [[50000,99999,0.70,0.84,1.05,1.26,1.68,2.31],[100000,199999,0.63,0.76,0.95,1.14,1.52,2.09],[200000,399999,0.58,0.69,0.87,1.04,1.39,1.91],[400000,999999,0.53,0.64,0.80,0.96,1.28,1.76]],
  4: [[50000,99999,0.91,1.09,1.37,1.64,2.19,3.01],[100000,199999,0.82,0.99,1.23,1.48,1.97,2.71],[200000,399999,0.75,0.90,1.12,1.35,1.80,2.47],[400000,999999,0.69,0.83,1.04,1.25,1.67,2.29]]
 } },
 senior_living: { name: "Senior Living / Assisted Living", note: "Windows separate, healthcare-adjacent", stages: {
  1: [[30000,59999,0.40,0.48,0.60,0.72,0.96,1.32],[60000,99999,0.36,0.44,0.55,0.66,0.88,1.21],[100000,179999,0.33,0.40,0.50,0.60,0.80,1.10],[180000,999999,0.30,0.37,0.46,0.55,0.73,1.01]],
  2: [[30000,59999,0.60,0.72,0.90,1.08,1.44,1.98],[60000,99999,0.55,0.66,0.82,0.99,1.32,1.81],[100000,179999,0.50,0.60,0.75,0.90,1.20,1.65],[180000,999999,0.46,0.55,0.69,0.83,1.11,1.52]],
  3: [[30000,59999,0.80,0.96,1.20,1.44,1.92,2.64],[60000,99999,0.73,0.88,1.10,1.32,1.76,2.42],[100000,179999,0.66,0.80,1.00,1.20,1.60,2.20],[180000,999999,0.61,0.73,0.92,1.10,1.47,2.02]],
  4: [[30000,59999,1.03,1.25,1.56,1.87,2.49,3.43],[60000,99999,0.95,1.15,1.43,1.72,2.29,3.15],[100000,179999,0.86,1.04,1.30,1.56,2.08,2.86],[180000,999999,0.79,0.95,1.19,1.43,1.91,2.62]]
 } },
 office: { name: "Mixed-Use / Commercial Office", note: "Windows separate", stages: {
  1: [[15000,29999,0.40,0.48,0.60,0.72,0.96,1.32],[30000,59999,0.36,0.43,0.54,0.65,0.87,1.19],[60000,119999,0.33,0.39,0.49,0.59,0.79,1.08],[120000,249999,0.30,0.36,0.45,0.54,0.72,0.99],[250000,999999,0.28,0.33,0.42,0.50,0.67,0.92]],
  2: [[15000,29999,0.60,0.72,0.90,1.08,1.44,1.98],[30000,59999,0.54,0.65,0.82,0.98,1.31,1.80],[60000,119999,0.49,0.59,0.74,0.89,1.19,1.63],[120000,249999,0.45,0.54,0.67,0.81,1.08,1.48],[250000,999999,0.41,0.50,0.62,0.75,1.00,1.37]],
  3: [[15000,29999,0.80,0.96,1.20,1.44,1.92,2.64],[30000,59999,0.72,0.87,1.08,1.30,1.73,2.38],[60000,119999,0.65,0.79,0.98,1.18,1.57,2.16],[120000,249999,0.60,0.72,0.90,1.08,1.44,1.98],[250000,999999,0.55,0.67,0.83,1.00,1.33,1.83]],
  4: [[15000,29999,1.03,1.25,1.56,1.87,2.49,3.43],[30000,59999,0.93,1.13,1.41,1.69,2.25,3.10],[60000,119999,0.85,1.02,1.27,1.53,2.04,2.80],[120000,249999,0.77,0.93,1.17,1.40,1.87,2.57],[250000,999999,0.72,0.87,1.08,1.30,1.73,2.38]]
 } },
 religious: { name: "Religious / Worship Facility", note: "Windows separate (stained glass specialty)", stages: {
  1: [[5000,14999,0.41,0.50,0.62,0.75,1.00,1.37],[15000,29999,0.36,0.44,0.55,0.66,0.88,1.21],[30000,59999,0.33,0.39,0.49,0.59,0.79,1.08],[60000,999999,0.29,0.35,0.44,0.53,0.71,0.97]],
  2: [[5000,14999,0.62,0.75,0.94,1.13,1.51,2.07],[15000,29999,0.55,0.66,0.82,0.99,1.32,1.81],[30000,59999,0.49,0.59,0.74,0.89,1.19,1.63],[60000,999999,0.44,0.53,0.67,0.80,1.07,1.47]],
  3: [[5000,14999,0.83,1.00,1.25,1.50,2.00,2.75],[15000,29999,0.73,0.88,1.10,1.32,1.76,2.42],[30000,59999,0.65,0.79,0.98,1.18,1.57,2.16],[60000,999999,0.59,0.71,0.88,1.06,1.41,1.94]],
  4: [[5000,14999,1.08,1.30,1.62,1.95,2.60,3.57],[15000,29999,0.95,1.15,1.43,1.72,2.29,3.15],[30000,59999,0.85,1.02,1.27,1.53,2.04,2.80],[60000,999999,0.76,0.92,1.15,1.38,1.84,2.53]]
 } },
 entertainment: { name: "Entertainment / Theater", note: "Windows usually N/A", stages: {
  1: [[5000,14999,0.45,0.54,0.67,0.81,1.08,1.48],[15000,29999,0.40,0.48,0.60,0.72,0.96,1.32],[30000,59999,0.36,0.43,0.54,0.65,0.87,1.19],[60000,999999,0.33,0.39,0.49,0.59,0.79,1.08]],
  2: [[5000,14999,0.67,0.81,1.02,1.22,1.63,2.24],[15000,29999,0.60,0.72,0.90,1.08,1.44,1.98],[30000,59999,0.54,0.65,0.82,0.98,1.31,1.80],[60000,999999,0.49,0.59,0.74,0.89,1.19,1.63]],
  3: [[5000,14999,0.90,1.08,1.35,1.62,2.16,2.97],[15000,29999,0.80,0.96,1.20,1.44,1.92,2.64],[30000,59999,0.72,0.87,1.08,1.30,1.73,2.38],[60000,999999,0.65,0.79,0.98,1.18,1.57,2.16]],
  4: [[5000,14999,1.17,1.41,1.76,2.11,2.81,3.87],[15000,29999,1.03,1.25,1.56,1.87,2.49,3.43],[30000,59999,0.93,1.13,1.41,1.69,2.25,3.10],[60000,999999,0.85,1.02,1.27,1.53,2.04,2.80]]
 } }
};
var CLIENTS = [
 // === FLC DIRECT / MSA CLIENTS ===
 { name: "JM Phelps Construction", def: "gas_station", msa: false, note: "Gas Stations / C-Stores, windows included" },
 { name: "Robins & Morton", def: "hospital", msa: false, note: "Hospitals; Schools. Facade restoration common." },
 { name: "SPD Construction", def: "dealership", msa: false, note: "Auto Dealerships" },
 { name: "Wier Construction", def: "dealership", msa: false, note: "Auto Dealerships" },
 { name: "Tegrity Contractors", def: "jail", msa: false, note: "Municipal - Jails, Police, Fire, Admin; Schools" },
 { name: "Undefeated Tribe (Crunch)", def: "gym", msa: true, note: "MSA: Fixed split. 30-39k: $0.17/$0.40/$0.20=$0.77 + GO $0.17=$0.94" },
 { name: "Sebastian Construction Group", def: "luxury_resi", msa: false, note: "Luxury Residential / Custom Home. Add chem/finish surcharge." },
 { name: "Maplewood Group", def: "restaurant", msa: false, note: "Luxury Commercial / TI. High-finish." },
 { name: "Gray Construction (Costco)", def: "big_box", msa: false, note: "Big-Box Retail. Exterior lots 100k+." },
 { name: "Brasfield & Gorrie", def: "gym", msa: false, note: "Gym/Fitness, Hospitals. Large-scale projects." },
 // === ENR TOP 50 ===
 { name: "Turner Construction", def: "hospital", msa: false, note: "ENR #1. General building, healthcare, education, telecom. National." },
 { name: "Kiewit Corp.", def: "industrial", msa: false, note: "ENR #2. Heavy civil, transportation, power, industrial. National." },
 { name: "Bechtel", def: "industrial", msa: false, note: "ENR #3. Industrial, power, petroleum, hazardous waste. Global mega-projects." },
 { name: "MasTec", def: "industrial", msa: false, note: "ENR #4. Power, petroleum, telecom infrastructure. National." },
 { name: "Whiting-Turner Contracting", def: "hospital", msa: false, note: "ENR #5. General building, industrial, telecom. National." },
 { name: "STO Building Group", def: "hospital", msa: false, note: "ENR #6. General building, industrial. National." },
 { name: "DPR Construction", def: "hospital", msa: false, note: "ENR #7. Healthcare, tech, industrial, telecom. National." },
 { name: "Fluor", def: "industrial", msa: false, note: "ENR #8. Industrial, petroleum, power, transportation. Global." },
 { name: "McDermott International", def: "industrial", msa: false, note: "ENR #9. Petroleum, industrial. Global." },
 { name: "PCL Construction", def: "hospital", msa: false, note: "ENR #10. General building, power, water. National." },
 { name: "Gilbane Building Co.", def: "hospital", msa: false, note: "ENR #11. General building, industrial, education, healthcare. National." },
 { name: "Skanska USA", def: "hospital", msa: false, note: "ENR #12. Building, transportation, telecom. National." },
 { name: "Hensel Phelps", def: "hospital", msa: false, note: "ENR #13. Building, manufacturing, transportation. National." },
 { name: "AECOM", def: "hospital", msa: false, note: "ENR #14. General building, transportation. National." },
 { name: "The Walsh Group", def: "industrial", msa: false, note: "ENR #15. Transportation, building, water. National." },
 { name: "Clark Group", def: "hospital", msa: false, note: "ENR #16. General building, transportation, telecom. National." },
 { name: "ARCO Construction", def: "industrial", msa: false, note: "ENR #17. General building, manufacturing, design-build. National." },
 { name: "JE Dunn Construction", def: "hospital", msa: false, note: "ENR #18. General building, telecom, industrial. National." },
 { name: "Barton Malow", def: "industrial", msa: false, note: "ENR #19. Manufacturing, building, power. National." },
 { name: "McCarthy Holdings", def: "hospital", msa: false, note: "ENR #20. Building, power, healthcare. National." },
 { name: "Walbridge", def: "industrial", msa: false, note: "ENR #21. Manufacturing, telecom, automotive. National." },
 { name: "Clayco", def: "industrial", msa: false, note: "ENR #23. Building, manufacturing, telecom, industrial. National." },
 { name: "Hoffman Construction", def: "industrial", msa: false, note: "ENR #24. Manufacturing, building. Pacific NW." },
 { name: "Suffolk Construction", def: "data_center", msa: false, note: "ENR #25. Data Centers, HEPA protocol, raised floor/plenum add-ons." },
 { name: "Hoar Construction", def: "luxury_hotel", msa: false, note: "Hotels & Luxury Hotels/Condos. VIP +$0.45/SF, ext $0.33/SF, win $26/pane." },
 { name: "HITT Contracting", def: "hospital", msa: false, note: "ENR #26. Building, telecom, interiors. National." },
 { name: "Mortenson", def: "hospital", msa: false, note: "ENR #27. Building, power, telecom. National." },
 { name: "Zachry Group", def: "industrial", msa: false, note: "ENR #28. Petroleum, power, industrial. Texas/National." },
 { name: "The Yates Companies", def: "industrial", msa: false, note: "ENR #29. Manufacturing, building, industrial. National." },
 { name: "Holder Construction", def: "hospital", msa: false, note: "ENR #30. Telecom, building, data centers. National." },
 { name: "Tutor Perini Corp.", def: "hospital", msa: false, note: "ENR #31. Building, transportation. National." },
 { name: "Balfour Beatty US", def: "hospital", msa: false, note: "ENR #32. General building, transportation. Dallas HQ. National." },
 { name: "Austin Industries", def: "industrial", msa: false, note: "ENR #33. Manufacturing, building, petroleum, transportation. Dallas HQ." },
 { name: "Michels Corp.", def: "industrial", msa: false, note: "ENR #34. Petroleum, power, transportation. National." },
 { name: "Swinerton", def: "hospital", msa: false, note: "ENR #35. General building, power. West Coast / National." },
 { name: "Alberici-Flintco", def: "industrial", msa: false, note: "ENR #36. Building, manufacturing, industrial, transportation. National." },
 { name: "Dragados", def: "industrial", msa: false, note: "ENR #37. Transportation, heavy civil. National." },
 { name: "Burns & McDonnell", def: "industrial", msa: false, note: "ENR #38. Power, petroleum, design-build. National." },
 { name: "Granite Construction", def: "industrial", msa: false, note: "ENR #39. Transportation, heavy civil. National." },
 { name: "Gray Construction", def: "industrial", msa: false, note: "ENR #40. Industrial, manufacturing, building, telecom. National." },
 { name: "Moss", def: "hospital", msa: false, note: "ENR #41. Building, power, solar. Southeast / National." },
 { name: "Ryan Companies", def: "hospital", msa: false, note: "ENR #42. General building. National." },
 { name: "Consigli Building Group", def: "hospital", msa: false, note: "ENR #43. General building. Northeast." },
 { name: "Black & Veatch", def: "industrial", msa: false, note: "ENR #44. Power, water, telecom. National." },
 { name: "Turner Industries Group", def: "industrial", msa: false, note: "ENR #45. Petroleum, industrial. Gulf Coast." },
 { name: "Big-D Construction", def: "hospital", msa: false, note: "ENR #46. Building, transportation. Intermountain West." },
 { name: "Colas Inc.", def: "industrial", msa: false, note: "ENR #47. Transportation, paving. National." },
 { name: "Alston Construction", def: "big_box", msa: false, note: "ENR #48. General building, distribution, retail. National." },
 { name: "Flatiron Construction", def: "industrial", msa: false, note: "ENR #49. Transportation, heavy civil. National." },
 { name: "The Kokosing Group", def: "industrial", msa: false, note: "ENR #50. Transportation, manufacturing, industrial. Ohio/National." },
 // === ENR 51-100 ===
 { name: "Sundt Construction", def: "hospital", msa: false, note: "ENR #51. Building, manufacturing, water, transportation. Southwest." },
 { name: "Choate Construction", def: "hospital", msa: false, note: "ENR #52. General building, industrial. Southeast." },
 { name: "Clune Construction", def: "hospital", msa: false, note: "ENR #53. Building, telecom, interiors. National." },
 { name: "F.A. Wilhelm Construction", def: "hospital", msa: false, note: "ENR #54. General building, manufacturing. Indiana." },
 { name: "Crossland Construction", def: "hospital", msa: false, note: "ENR #55. General building, manufacturing, water. Kansas/National." },
 { name: "Evans General Contractors", def: "industrial", msa: false, note: "ENR #57. Building, manufacturing, industrial. Southeast." },
 { name: "Devcon Construction", def: "hospital", msa: false, note: "ENR #58. General building. California." },
 { name: "Sterling Infrastructure", def: "industrial", msa: false, note: "ENR #59. Building, transportation. Texas." },
 { name: "Harvey-Cleary", def: "hospital", msa: false, note: "ENR #60. General building. Texas." },
 { name: "Pepper Construction", def: "hospital", msa: false, note: "ENR #63. General building, telecom. Chicago/National." },
 { name: "Garney Holding Co.", def: "industrial", msa: false, note: "ENR #64. Water/sewer infrastructure. National." },
 { name: "Hunter Roberts Construction", def: "hospital", msa: false, note: "ENR #65. General building. New York." },
 { name: "Core Construction Group", def: "hospital", msa: false, note: "ENR #66. General building. Frisco, TX." },
 { name: "Manhattan Construction Group", def: "hospital", msa: false, note: "ENR #67. Building, transportation, petroleum. Tulsa/National." },
 { name: "J.T. Magen & Co.", def: "hospital", msa: false, note: "ENR #68. Building, telecom, interiors. New York." },
 { name: "Haskell", def: "industrial", msa: false, note: "ENR #69. Industrial, petroleum, design-build. Jacksonville/National." },
 { name: "Fortis Construction", def: "hospital", msa: false, note: "ENR #70. Telecom, data centers. Portland/National." },
 { name: "Miron Construction", def: "industrial", msa: false, note: "ENR #71. Industrial, building. Wisconsin." },
 { name: "E.E. Reed Construction", def: "hospital", msa: false, note: "ENR #72. General building. Texas." },
 { name: "Brinkmann Constructors", def: "hospital", msa: false, note: "ENR #73. General building, manufacturing. St. Louis." },
 { name: "Shawmut Design and Construction", def: "small_retail", msa: false, note: "ENR #74. General building, interiors, high-end. National." },
 { name: "Exyte Americas", def: "industrial", msa: false, note: "ENR #75. Manufacturing, semiconductor fabs. Plano, TX." },
 { name: "The Boldt Co.", def: "industrial", msa: false, note: "ENR #76. Building, industrial, power. Wisconsin." },
 { name: "FCL Builders", def: "big_box", msa: false, note: "ENR #77. General building, distribution. Chicago." },
 { name: "Hathaway Dinwiddie", def: "hospital", msa: false, note: "ENR #78. General building. San Francisco." },
 { name: "Power Construction", def: "hospital", msa: false, note: "ENR #79. General building. Chicago." },
 { name: "Summit Contracting Group", def: "hospital", msa: false, note: "ENR #80. General building, multifamily. Jacksonville." },
 { name: "Construction Partners", def: "industrial", msa: false, note: "ENR #81. General building. Southeast." },
 { name: "Messer Construction", def: "hospital", msa: false, note: "ENR #82. General building, manufacturing. Cincinnati/National." },
 { name: "Okland Construction", def: "hospital", msa: false, note: "ENR #83. Building, manufacturing. Salt Lake City." },
 { name: "The Weitz Company", def: "hospital", msa: false, note: "ENR #85. Building, telecom, petroleum. Des Moines." },
 { name: "The Rudolph Libbe Cos.", def: "industrial", msa: false, note: "ENR #86. Manufacturing, building, industrial. Ohio." },
 { name: "The Christman Co.", def: "hospital", msa: false, note: "ENR #87. General building. Michigan." },
 { name: "Build Group", def: "hospital", msa: false, note: "ENR #88. General building. San Francisco." },
 { name: "Samet Corp.", def: "hospital", msa: false, note: "ENR #89. General building, manufacturing. Greensboro, NC." },
 { name: "Lendlease", def: "hospital", msa: false, note: "ENR #90. General building. New York." },
 { name: "Adolfson & Peterson Construction", def: "hospital", msa: false, note: "ENR #91. Building, manufacturing. Minneapolis." },
 { name: "PJ Dick - Trumbull - Lindy Group", def: "industrial", msa: false, note: "ENR #92. Building, transportation. Pittsburgh." },
 { name: "BL Harbert International", def: "hospital", msa: false, note: "ENR #93. General building. Birmingham, AL." },
 { name: "Webcor", def: "hospital", msa: false, note: "ENR #94. General building, water. San Francisco." },
 { name: "Day & Zimmermann", def: "industrial", msa: false, note: "ENR #95. Power, industrial, manufacturing. Philadelphia." },
 { name: "The McShane Cos.", def: "big_box", msa: false, note: "ENR #96. General building, distribution. Chicago." },
 { name: "Nabholz", def: "hospital", msa: false, note: "ENR #97. General building, manufacturing. Arkansas." },
 { name: "Allan Myers", def: "industrial", msa: false, note: "ENR #98. Transportation, heavy civil. Mid-Atlantic." },
 { name: "J.H. Findorff & Son", def: "hospital", msa: false, note: "ENR #99. General building. Wisconsin." },
 // === ENR 101-200 ===
 { name: "W.E. O'Neil Construction", def: "hospital", msa: false, note: "ENR #101. General building. Chicago." },
 { name: "BNBuilders", def: "hospital", msa: false, note: "ENR #102. General building. Seattle." },
 { name: "Dennis Group", def: "industrial", msa: false, note: "ENR #103. Industrial, manufacturing, food/bev. National." },
 { name: "Lane Industries", def: "industrial", msa: false, note: "ENR #104. Transportation, heavy civil. Charlotte." },
 { name: "ASRC Industrial", def: "industrial", msa: false, note: "ENR #105. Multi-sector industrial. Arizona." },
 { name: "The Penta Building Group", def: "hospital", msa: false, note: "ENR #106. General building. Las Vegas." },
 { name: "Southland Holdings", def: "industrial", msa: false, note: "ENR #107. Transportation, water. Grapevine, TX." },
 { name: "The Cianbro Cos.", def: "industrial", msa: false, note: "ENR #108. Industrial, power, transportation. Maine." },
 { name: "OHLA USA", def: "industrial", msa: false, note: "ENR #109. Transportation, heavy civil. New York." },
 { name: "LeChase Construction", def: "hospital", msa: false, note: "ENR #110. General building, industrial. New York." },
 { name: "Rycon Construction", def: "hospital", msa: false, note: "ENR #111. General building, transportation. Pittsburgh." },
 { name: "McGough", def: "hospital", msa: false, note: "ENR #115. General building, manufacturing. St. Paul." },
 { name: "Joeris General Contractors", def: "hospital", msa: false, note: "ENR #117. General building. San Antonio." },
 { name: "JRM Construction Management", def: "hospital", msa: false, note: "ENR #118. General building, interiors. New York." },
 { name: "Emery Sapp & Sons", def: "industrial", msa: false, note: "ENR #119. Building, transportation, manufacturing. Missouri." },
 { name: "Clancy & Theys Construction", def: "hospital", msa: false, note: "ENR #120. General building. Raleigh, NC." },
 { name: "Graham Construction", def: "hospital", msa: false, note: "ENR #123. General building, water. Omaha." },
 { name: "Andersen Construction", def: "hospital", msa: false, note: "ENR #124. General building. Portland, OR." },
 { name: "Bartlett Cocke General Contractors", def: "hospital", msa: false, note: "ENR #125. General building. San Antonio." },
 { name: "Caddell Construction", def: "hospital", msa: false, note: "ENR #129. General building, federal. Montgomery, AL." },
 { name: "Truebeck Construction", def: "hospital", msa: false, note: "ENR #130. General building, interiors. San Mateo, CA." },
 { name: "Jacobsen Construction", def: "hospital", msa: false, note: "ENR #131. General building. Salt Lake City." },
 { name: "Lease Crutcher Lewis", def: "hospital", msa: false, note: "ENR #133. General building, telecom. Seattle." },
 { name: "APTIM", def: "industrial", msa: false, note: "ENR #134. Industrial, petroleum, hazardous waste. Baton Rouge." },
 { name: "Hoar Construction", def: "hospital", msa: false, note: "ENR #135. General building. Birmingham, AL." },
 { name: "The Beck Group", def: "hospital", msa: false, note: "ENR #136. General building, telecom. Dallas." },
 { name: "Satterfield & Pontikes", def: "hospital", msa: false, note: "ENR #137. General building, water. Houston." },
 { name: "Coastal Construction Group", def: "hospital", msa: false, note: "ENR #138. General building, high-rise. Miami." },
 { name: "Catamount Constructors", def: "hospital", msa: false, note: "ENR #139. General building. Colorado." },
 { name: "Kraus-Anderson", def: "hospital", msa: false, note: "ENR #140. General building. Minneapolis." },
 { name: "Kast Construction", def: "hospital", msa: false, note: "ENR #141. General building. West Palm Beach." },
 { name: "Wharton-Smith", def: "hospital", msa: false, note: "ENR #144. Building, water infrastructure. Sanford, FL." },
 { name: "Kajima Building & Design Group", def: "industrial", msa: false, note: "ENR #146. Manufacturing, building. Atlanta." },
 { name: "KPRS Construction", def: "hospital", msa: false, note: "ENR #147. General building, manufacturing. California." },
 { name: "Paric Holdings", def: "hospital", msa: false, note: "ENR #148. Building, manufacturing, power. St. Louis." },
 { name: "Rogers-O'Brien Construction", def: "hospital", msa: false, note: "ENR #149. General building, telecom. Dallas." },
 { name: "Pogue Construction", def: "hospital", msa: false, note: "ENR #152. General building. McKinney, TX." },
 { name: "Saulsbury", def: "industrial", msa: false, note: "ENR #153. Petroleum, power, industrial. Odessa, TX." },
 { name: "Torcon", def: "hospital", msa: false, note: "ENR #156. General building. New Jersey." },
 { name: "S&B Engineers", def: "industrial", msa: false, note: "ENR #157. Petroleum, industrial. Houston." },
 { name: "Weis Builders", def: "hospital", msa: false, note: "ENR #158. General building. Minneapolis." },
 { name: "McCownGordon Construction", def: "hospital", msa: false, note: "ENR #161. General building. Kansas City." },
 { name: "Barnhill Contracting", def: "industrial", msa: false, note: "ENR #167. Building, transportation. North Carolina." },
 { name: "Stellar Group", def: "industrial", msa: false, note: "ENR #170. Industrial, manufacturing. Jacksonville." },
 { name: "Arch-Con Corp.", def: "hospital", msa: false, note: "ENR #173. General building. Houston." },
 { name: "Harkins Builders", def: "hospital", msa: false, note: "ENR #174. General building. Maryland." },
 { name: "Elford Inc.", def: "hospital", msa: false, note: "ENR #175. General building, manufacturing. Columbus, OH." },
 { name: "Saunders Construction", def: "hospital", msa: false, note: "ENR #176. General building. Colorado." },
 { name: "The Korte Co.", def: "hospital", msa: false, note: "ENR #178. General building, design-build. Illinois." },
 { name: "Carroll Daniel Construction", def: "hospital", msa: false, note: "ENR #179. Building, manufacturing, industrial. Georgia." },
 { name: "Dimeo Construction", def: "hospital", msa: false, note: "ENR #180. General building. Providence, RI." },
 { name: "J.P. Cullen and Sons", def: "hospital", msa: false, note: "ENR #183. Building, manufacturing. Wisconsin." },
 { name: "FCI Constructors", def: "hospital", msa: false, note: "ENR #184. General building. Colorado." },
 { name: "C.W. Driver Cos.", def: "hospital", msa: false, note: "ENR #185. General building. Pasadena, CA." },
 { name: "Willmeng Construction", def: "hospital", msa: false, note: "ENR #186. General building. Phoenix." },
 { name: "Sellen Construction", def: "hospital", msa: false, note: "ENR #188. General building. Seattle." },
 { name: "SpawGlass", def: "hospital", msa: false, note: "ENR #189. General building, transportation. Selma, TX." },
 { name: "The Opus Group", def: "hospital", msa: false, note: "ENR #192. General building. Minneapolis." },
 { name: "Oltmans Construction", def: "hospital", msa: false, note: "ENR #194. General building. California." },
 { name: "GE Johnson", def: "hospital", msa: false, note: "ENR #195. General building. Colorado Springs." },
 { name: "Landmark Construction", def: "hospital", msa: false, note: "ENR #196. General building. Athens, GA." },
 { name: "Bernards", def: "hospital", msa: false, note: "ENR #197. General building. San Fernando, CA." },
 // === ENR 201-300 (SELECTED) ===
 { name: "C D Smith Construction", def: "hospital", msa: false, note: "ENR #202. Building, water. Wisconsin." },
 { name: "Kaufman Lynn Construction", def: "hospital", msa: false, note: "ENR #204. General building. South Florida." },
 { name: "Batson-Cook Construction", def: "hospital", msa: false, note: "ENR #205. General building. Atlanta." },
 { name: "Shaw Construction", def: "hospital", msa: false, note: "ENR #206. General building. Denver." },
 { name: "Lee Lewis Construction", def: "hospital", msa: false, note: "ENR #212. General building. Lubbock, TX." },
 { name: "New South Construction", def: "hospital", msa: false, note: "ENR #213. General building, transportation. Atlanta." },
 { name: "EMJ Construction", def: "hospital", msa: false, note: "ENR #217. General building. Chattanooga." },
 { name: "MW Builders", def: "hospital", msa: false, note: "ENR #220. General building. Pflugerville, TX." },
 { name: "Pike Construction Services", def: "hospital", msa: false, note: "ENR #221. General building. Rochester, NY." },
 { name: "Rodgers Builders", def: "hospital", msa: false, note: "ENR #224. General building. Charlotte, NC." },
 { name: "Skender", def: "hospital", msa: false, note: "ENR #227. General building. Chicago." },
 { name: "Edifice Construction", def: "hospital", msa: false, note: "ENR #229. Building, manufacturing. Charlotte." },
 { name: "Graycor", def: "industrial", msa: false, note: "ENR #231. Building, manufacturing, power. Chicago." },
 { name: "Parkway C&A", def: "hospital", msa: false, note: "ENR #233. General building. Lewisville, TX." },
 { name: "MYCON General Contractors", def: "industrial", msa: false, note: "ENR #234. General building, manufacturing. Dallas." },
 { name: "JPI", def: "hospital", msa: false, note: "ENR #235. General building, multifamily. Dallas." },
 { name: "Granger Construction", def: "hospital", msa: false, note: "ENR #237. General building, telecom. Michigan." },
 { name: "CRB", def: "industrial", msa: false, note: "ENR #238. Industrial, pharmaceutical. Kansas City." },
 { name: "Rockford Construction", def: "hospital", msa: false, note: "ENR #239. Building, manufacturing. Grand Rapids." },
 { name: "Kitchell Corp.", def: "hospital", msa: false, note: "ENR #242. General building. Phoenix." },
 { name: "W.M. Jordan Co.", def: "hospital", msa: false, note: "ENR #243. Building, manufacturing. Virginia." },
 { name: "Knutson Construction", def: "hospital", msa: false, note: "ENR #246. General building, manufacturing. Minneapolis." },
 { name: "Wohlsen Construction", def: "hospital", msa: false, note: "ENR #248. Building, manufacturing. Pennsylvania." },
 { name: "IMC Construction", def: "hospital", msa: false, note: "ENR #252. General building. Minority-owned. National." },
 { name: "DeAngelis Diamond", def: "hospital", msa: false, note: "ENR #253. General building. Naples, FL." },
 { name: "BBL Construction", def: "hospital", msa: false, note: "ENR #254. General building. Albany, NY." },
 { name: "LeMoine", def: "hospital", msa: false, note: "ENR #255. General building. Lafayette, LA." },
 { name: "Shiel Sexton", def: "hospital", msa: false, note: "ENR #256. General building. Indianapolis." },
 { name: "Peinado Construction", def: "industrial", msa: false, note: "ENR #258. Building, industrial, petroleum. Frisco, TX." },
 { name: "Andres Construction Services", def: "hospital", msa: false, note: "ENR #259. General building. Dallas." },
 { name: "Haselden Construction", def: "hospital", msa: false, note: "ENR #262. General building. Colorado." },
 { name: "Juneau Construction", def: "hospital", msa: false, note: "ENR #272. General building. Atlanta." },
 { name: "Shelco LLC", def: "hospital", msa: false, note: "ENR #274. Building, manufacturing. Charlotte." },
 { name: "Primus Builders", def: "industrial", msa: false, note: "ENR #278. Building, manufacturing, cold storage. Georgia." },
 { name: "Danis", def: "hospital", msa: false, note: "ENR #251. General building, manufacturing. Ohio." },
 { name: "Leopardo Construction", def: "hospital", msa: false, note: "ENR #287. General building. Chicago." },
 { name: "Harper General Contractors", def: "hospital", msa: false, note: "ENR #288. Building, water. Greenville, SC." },
 { name: "R&O Construction", def: "hospital", msa: false, note: "ENR #290. General building, manufacturing. Utah." },
 { name: "KBS Inc.", def: "hospital", msa: false, note: "ENR #292. General building, manufacturing. Richmond, VA." },
 { name: "Drymalla Construction", def: "hospital", msa: false, note: "ENR #294. General building. Columbus, TX." },
 // === ENR 300-400 (SELECTED) ===
 { name: "Wieland", def: "hospital", msa: false, note: "ENR #318. General building, multifamily." },
 { name: "Poettker Construction", def: "hospital", msa: false, note: "ENR #339. General building." },
 { name: "Doster Construction", def: "hospital", msa: false, note: "General building. Alabama." },
 { name: "Rand Construction", def: "hospital", msa: false, note: "ENR #223. General building, interiors. Virginia." },
 { name: "Grunley Construction", def: "hospital", msa: false, note: "ENR #226. General building. Maryland/DC." },
 { name: "James G. Davis Construction", def: "hospital", msa: false, note: "ENR #128. General building. Maryland." },
 { name: "Mascaro Construction", def: "hospital", msa: false, note: "ENR #286. Building, transportation, industrial. Pittsburgh." },
 // === OTHER MAJOR / REGIONAL GCS ===
 { name: "Dacon Corp.", def: "hospital", msa: false, note: "General building. Texas." },
 { name: "Cadence McShane Construction", def: "hospital", msa: false, note: "General building, multifamily. Dallas." },
 { name: "Baxter Construction", def: "hospital", msa: false, note: "General building. Oklahoma." },
 { name: "Manhattan Construction", def: "hospital", msa: false, note: "General building, transportation. Tulsa/Dallas." },
 { name: "Layton Construction", def: "hospital", msa: false, note: "General building. Salt Lake City." },
 { name: "Welbro Building Corp.", def: "hospital", msa: false, note: "General building. Maitland, FL." },
 { name: "Byrne Construction Services", def: "hospital", msa: false, note: "General building. Fort Worth." },
 { name: "Jordan Foster Construction", def: "hospital", msa: false, note: "General building. El Paso / Texas." },
 { name: "TDIndustries", def: "hospital", msa: false, note: "MEP / specialty. Dallas." },
 { name: "Dooley Mack Constructors", def: "hospital", msa: false, note: "General building. Texas." },
 { name: "Steele & Freeman", def: "hospital", msa: false, note: "General building. Dallas." },
 { name: "KDC Real Estate", def: "industrial", msa: false, note: "Corporate campuses, industrial. Dallas." },
 { name: "Linbeck Group", def: "hospital", msa: false, note: "General building, healthcare. Houston." },
 { name: "W.G. Yates & Sons", def: "industrial", msa: false, note: "General building, industrial. Mississippi." },
 { name: "Boldt Company", def: "industrial", msa: false, note: "Industrial, building, power. Wisconsin." },
 { name: "Structure Tone", def: "hospital", msa: false, note: "Interiors, general building. Part of STO Building Group." },
 { name: "Pavarini McGovern", def: "hospital", msa: false, note: "General building. Part of STO Building Group. New York." },
 { name: "Stiles Construction", def: "hospital", msa: false, note: "General building. Fort Lauderdale." },
 { name: "Jacobsen Construction Co.", def: "hospital", msa: false, note: "General building. Utah." },
 { name: "Wm. Blanchard Co.", def: "hospital", msa: false, note: "General building. New Jersey." },
 { name: "James McHugh Construction", def: "hospital", msa: false, note: "General building, high-rise. Chicago." },
 { name: "Walsh Construction", def: "hospital", msa: false, note: "General building, transportation, water. Part of Walsh Group." },
 { name: "Hunt Construction Group", def: "hospital", msa: false, note: "General building, sports venues. National." },
 { name: "Lend Lease", def: "hospital", msa: false, note: "General building, high-rise. New York." },
 { name: "Plaza Construction", def: "hospital", msa: false, note: "General building. Part of China Construction America. NYC." },
 { name: "Commodore Builders", def: "hospital", msa: false, note: "ENR #279. General building. Boston." },
 { name: "Dellbrook JKS", def: "hospital", msa: false, note: "ENR #216. General building. Massachusetts." }
];
var ALL_STAGES = [
 { id: "preEquip", name: "Pre-Equipment", short: "Pre-Equip", w3: 0.23, w4: 0.23 },
 { id: "prePunch", name: "Pre-Punchlist Deep Clean", short: "PPDC", w3: 0.42, w4: 0.37 },
 { id: "final", name: "Final Cleaning", short: "Final", w3: 0.35, w4: 0.30 },
 { id: "go", name: "VIP & Grand Opening", short: "VIP/GO", w3: 0, w4: 0.10 }
];
var PRESETS = [
 { label: "Final Only", ids: ["final"] },
 { label: "PPDC + Final", ids: ["prePunch", "final"] },
 { label: "3-Stage", ids: ["preEquip", "prePunch", "final"] },
 { label: "4-Stage BLU", ids: ["preEquip", "prePunch", "final", "go"] }
];
var SURCH_LIST = [
 { id: "night", name: "Night/Rush", range: "15-35%", min: 15, max: 35, def: 25 },
 { id: "lifts", name: "Lifts/Access", range: "10-25%", min: 10, max: 25, def: 15 },
 { id: "heavy", name: "Heavy Soils", range: "10-35%", min: 10, max: 35, def: 20 },
 { id: "chem", name: "Chem/Restore", range: "25-60%", min: 25, max: 60, def: 40 }
];
var CITIES = [
 { n: "Dallas, TX", la: 32.78, lo: -96.80 }, { n: "Fort Worth, TX", la: 32.76, lo: -97.33 },
 { n: "Houston, TX", la: 29.76, lo: -95.37 }, { n: "San Antonio, TX", la: 29.42, lo: -98.49 },
 { n: "Austin, TX", la: 30.27, lo: -97.74 }, { n: "Plano, TX", la: 33.02, lo: -96.70 },
 { n: "Frisco, TX", la: 33.15, lo: -96.82 }, { n: "McKinney, TX", la: 33.20, lo: -96.64 },
 { n: "Allen, TX", la: 33.10, lo: -96.67 }, { n: "Prosper, TX", la: 33.24, lo: -96.80 },
 { n: "Carrollton, TX", la: 32.95, lo: -96.89 }, { n: "Celina, TX", la: 33.32, lo: -96.78 },
 { n: "Anna, TX", la: 33.35, lo: -96.55 }, { n: "Melissa, TX", la: 33.29, lo: -96.57 },
 { n: "Arlington, TX", la: 32.74, lo: -97.11 }, { n: "Irving, TX", la: 32.81, lo: -96.95 },
 { n: "Garland, TX", la: 32.91, lo: -96.64 }, { n: "Denton, TX", la: 33.21, lo: -97.13 },
 { n: "Rockwall, TX", la: 32.93, lo: -96.46 }, { n: "Mesquite, TX", la: 32.77, lo: -96.60 },
 { n: "Richardson, TX", la: 32.95, lo: -96.73 }, { n: "Lewisville, TX", la: 33.05, lo: -96.99 },
 { n: "Flower Mound, TX", la: 33.01, lo: -97.10 }, { n: "Mansfield, TX", la: 32.56, lo: -97.14 },
 { n: "Grand Prairie, TX", la: 32.75, lo: -96.99 }, { n: "Cedar Hill, TX", la: 32.59, lo: -96.96 },
 { n: "Wylie, TX", la: 33.02, lo: -96.54 }, { n: "Murphy, TX", la: 33.01, lo: -96.61 },
 { n: "Sachse, TX", la: 32.98, lo: -96.59 }, { n: "Rowlett, TX", la: 32.91, lo: -96.56 },
 { n: "Little Elm, TX", la: 33.16, lo: -96.94 }, { n: "The Colony, TX", la: 33.09, lo: -96.89 },
 { n: "Forney, TX", la: 32.75, lo: -96.47 }, { n: "Fate, TX", la: 32.94, lo: -96.38 },
 { n: "Royse City, TX", la: 32.97, lo: -96.33 }, { n: "Heath, TX", la: 32.84, lo: -96.47 },
 { n: "Sunnyvale, TX", la: 32.80, lo: -96.56 }, { n: "Caddo Mills, TX", la: 32.95, lo: -96.23 },
 { n: "Greenville, TX", la: 33.14, lo: -96.11 }, { n: "Terrell, TX", la: 32.74, lo: -96.28 },
 { n: "Kaufman, TX", la: 32.59, lo: -96.31 }, { n: "Waxahachie, TX", la: 32.39, lo: -96.85 },
 { n: "Midlothian, TX", la: 32.48, lo: -96.99 }, { n: "Ennis, TX", la: 32.33, lo: -96.63 },
 { n: "Corsicana, TX", la: 32.10, lo: -96.47 }, { n: "Lancaster, TX", la: 32.59, lo: -96.76 },
 { n: "DeSoto, TX", la: 32.59, lo: -96.86 }, { n: "Duncanville, TX", la: 32.65, lo: -96.91 },
 { n: "Coppell, TX", la: 32.95, lo: -97.02 }, { n: "Grapevine, TX", la: 32.93, lo: -97.08 },
 { n: "Colleyville, TX", la: 32.88, lo: -97.15 }, { n: "Southlake, TX", la: 32.94, lo: -97.13 },
 { n: "Keller, TX", la: 32.93, lo: -97.25 }, { n: "North Richland Hills, TX", la: 32.83, lo: -97.23 },
 { n: "Bedford, TX", la: 32.84, lo: -97.14 }, { n: "Euless, TX", la: 32.84, lo: -97.08 },
 { n: "Hurst, TX", la: 32.82, lo: -97.17 }, { n: "Weatherford, TX", la: 32.76, lo: -97.80 },
 { n: "Burleson, TX", la: 32.54, lo: -97.32 }, { n: "Cleburne, TX", la: 32.35, lo: -97.39 },
 { n: "Sherman, TX", la: 33.64, lo: -96.61 }, { n: "Denison, TX", la: 33.76, lo: -96.54 },
 { n: "Gainesville, TX", la: 33.63, lo: -97.13 }, { n: "Paris, TX", la: 33.66, lo: -95.56 },
 { n: "Bonham, TX", la: 33.58, lo: -96.18 }, { n: "Commerce, TX", la: 33.25, lo: -95.90 },
 { n: "Sulphur Springs, TX", la: 33.14, lo: -95.60 }, { n: "Mt Pleasant, TX", la: 33.16, lo: -94.97 },
 { n: "Tyler, TX", la: 32.35, lo: -95.30 }, { n: "Longview, TX", la: 32.50, lo: -94.74 },
 { n: "Lubbock, TX", la: 33.58, lo: -101.86 }, { n: "Amarillo, TX", la: 35.22, lo: -101.83 },
 { n: "Waco, TX", la: 31.55, lo: -97.15 }, { n: "Temple, TX", la: 31.10, lo: -97.34 },
 { n: "Killeen, TX", la: 31.12, lo: -97.73 }, { n: "College Station, TX", la: 30.63, lo: -96.33 },
 { n: "Abilene, TX", la: 32.45, lo: -99.73 }, { n: "Midland, TX", la: 32.00, lo: -102.08 },
 { n: "Odessa, TX", la: 31.85, lo: -102.37 }, { n: "El Paso, TX", la: 31.76, lo: -106.49 },
 { n: "Corpus Christi, TX", la: 27.80, lo: -97.40 }, { n: "Beaumont, TX", la: 30.08, lo: -94.13 },
 { n: "Round Rock, TX", la: 30.51, lo: -97.68 }, { n: "Georgetown, TX", la: 30.63, lo: -97.68 },
 { n: "Cedar Park, TX", la: 30.51, lo: -97.82 }, { n: "Sugar Land, TX", la: 29.62, lo: -95.63 },
 { n: "Pearland, TX", la: 29.56, lo: -95.29 }, { n: "Katy, TX", la: 29.79, lo: -95.82 },
 { n: "The Woodlands, TX", la: 30.17, lo: -95.46 }, { n: "Conroe, TX", la: 30.31, lo: -95.46 },
 { n: "Lufkin, TX", la: 31.34, lo: -94.73 }, { n: "Texarkana, TX", la: 33.44, lo: -94.05 },
 { n: "Laredo, TX", la: 27.50, lo: -99.51 }, { n: "McAllen, TX", la: 26.20, lo: -98.23 },
 { n: "Wichita Falls, TX", la: 33.91, lo: -98.49 }, { n: "Canton, TX", la: 32.56, lo: -95.86 },
 { n: "Oklahoma City, OK", la: 35.47, lo: -97.52 }, { n: "Tulsa, OK", la: 36.15, lo: -95.99 },
 { n: "Norman, OK", la: 35.22, lo: -97.44 }, { n: "Edmond, OK", la: 35.65, lo: -97.48 },
 { n: "Broken Arrow, OK", la: 36.06, lo: -95.79 }, { n: "Ardmore, OK", la: 34.17, lo: -97.14 },
 { n: "Durant, OK", la: 33.99, lo: -96.39 },
 { n: "Shreveport, LA", la: 32.53, lo: -93.75 }, { n: "Baton Rouge, LA", la: 30.45, lo: -91.19 },
 { n: "New Orleans, LA", la: 29.95, lo: -90.07 }, { n: "Lafayette, LA", la: 30.22, lo: -92.02 },
 { n: "Little Rock, AR", la: 34.75, lo: -92.29 }, { n: "Fort Smith, AR", la: 35.39, lo: -94.40 },
 { n: "Fayetteville, AR", la: 36.08, lo: -94.17 }, { n: "Bentonville, AR", la: 36.37, lo: -94.21 },
 { n: "Memphis, TN", la: 35.15, lo: -90.05 }, { n: "Nashville, TN", la: 36.16, lo: -86.78 },
 { n: "Atlanta, GA", la: 33.75, lo: -84.39 }, { n: "Birmingham, AL", la: 33.52, lo: -86.80 },
 { n: "Denver, CO", la: 39.74, lo: -104.99 }, { n: "Phoenix, AZ", la: 33.45, lo: -112.07 },
 { n: "Kansas City, MO", la: 39.10, lo: -94.58 }, { n: "Chicago, IL", la: 41.88, lo: -87.63 },
 { n: "Charlotte, NC", la: 35.23, lo: -80.84 }, { n: "Jacksonville, FL", la: 30.33, lo: -81.66 },
 { n: "Tampa, FL", la: 27.95, lo: -82.46 }, { n: "Orlando, FL", la: 28.54, lo: -81.38 },
 { n: "Miami, FL", la: 25.76, lo: -80.19 }, { n: "Fort Lauderdale, FL", la: 26.12, lo: -80.14 },
 { n: "West Palm Beach, FL", la: 26.72, lo: -80.05 }, { n: "St. Petersburg, FL", la: 27.77, lo: -82.64 },
 { n: "Sarasota, FL", la: 27.34, lo: -82.53 }, { n: "Fort Myers, FL", la: 26.64, lo: -81.87 },
 { n: "Naples, FL", la: 26.14, lo: -81.79 }, { n: "Pensacola, FL", la: 30.44, lo: -87.22 },
 { n: "Tallahassee, FL", la: 30.44, lo: -84.28 }, { n: "Gainesville, FL", la: 29.65, lo: -82.32 },
 { n: "Daytona Beach, FL", la: 29.21, lo: -81.02 }, { n: "Lakeland, FL", la: 28.04, lo: -81.95 },
 { n: "Ocala, FL", la: 29.19, lo: -82.14 }, { n: "Panama City, FL", la: 30.16, lo: -85.66 },
 { n: "Mobile, AL", la: 30.69, lo: -88.04 }, { n: "Montgomery, AL", la: 32.38, lo: -86.30 },
 { n: "Huntsville, AL", la: 34.73, lo: -86.59 }, { n: "Tuscaloosa, AL", la: 33.21, lo: -87.57 },
 { n: "Jackson, MS", la: 32.30, lo: -90.18 }, { n: "Gulfport, MS", la: 30.37, lo: -89.09 },
 { n: "Biloxi, MS", la: 30.40, lo: -88.88 }, { n: "Hattiesburg, MS", la: 31.33, lo: -89.29 },
 { n: "Savannah, GA", la: 32.08, lo: -81.09 }, { n: "Augusta, GA", la: 33.47, lo: -81.97 },
 { n: "Macon, GA", la: 32.84, lo: -83.63 }, { n: "Columbus, GA", la: 32.46, lo: -84.99 },
 { n: "Charleston, SC", la: 32.78, lo: -79.93 }, { n: "Columbia, SC", la: 34.00, lo: -81.03 },
 { n: "Greenville, SC", la: 34.85, lo: -82.40 }, { n: "Raleigh, NC", la: 35.78, lo: -78.64 }
];
function calcMiles(la, lo) {
 var R = 3959;
 var d1 = (la - HLat) * Math.PI / 180;
 var d2 = (lo - HLng) * Math.PI / 180;
 var a = Math.sin(d1 / 2) * Math.sin(d1 / 2) + Math.cos(HLat * Math.PI / 180) * Math.cos(la * Math.PI / 180) * Math.sin(d2 / 2) * Math.sin(d2 / 2);
 return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3);
}
function findCities(q) {
 if (!q || q.length < 2) { return []; }
 var lq = q.toLowerCase();
 return CITIES.filter(function(c) { return c.n.toLowerCase().indexOf(lq) >= 0; }).slice(0, 10);
}
function lookupRate(bt, sf, sc, ti) {
 var b = P[bt];
 if (!b || !b.stages) { return null; }
 var bands = b.stages[sc];
 if (!bands) {
  var keys = Object.keys(b.stages).map(Number).sort(function(a,c){return a-c;});
  for (var k = keys.length - 1; k >= 0; k--) { if (keys[k] <= sc) { bands = b.stages[keys[k]]; break; } }
  if (!bands) { bands = b.stages[keys[0]]; }
 }
 if (!bands || bands.length === 0) { return null; }
 // Direct match
 for (var i = 0; i < bands.length; i++) {
  if (sf >= bands[i][0] && sf <= bands[i][1]) { return bands[i][ti + 2]; }
 }
 // Below all bands — use first band rate
 if (sf < bands[0][0]) { return bands[0][ti + 2]; }
 // Above all bands — use last band rate
 var last = bands[bands.length - 1];
 if (sf > last[1]) { return last[ti + 2]; }
 // Falls in a gap between bands — interpolate between adjacent bands
 for (var j = 0; j < bands.length - 1; j++) {
  if (sf > bands[j][1] && sf < bands[j + 1][0]) {
   var loRate = bands[j][ti + 2];
   var hiRate = bands[j + 1][ti + 2];
   var gapStart = bands[j][1];
   var gapEnd = bands[j + 1][0];
   var pct = (sf - gapStart) / (gapEnd - gapStart);
   return Math.round((loRate + (hiRate - loRate) * pct) * 100) / 100;
  }
 }
 return bands[0][ti + 2];
}
function fmt(n) { return (n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtR(n) { return (n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtN(n) { return (n || 0).toLocaleString("en-US"); }
function escHtml(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function getAIEndpoint() {
 // On deployed sites (Cloudflare Pages, Vercel, custom domains), use serverless proxy.
 // In artifact sandbox (no hostname or anthropic domain), use direct API.
 var h = window.location.hostname;
 if (h && h !== "localhost" && h.indexOf("anthropic") < 0 && h.indexOf("claude") < 0) {
  return "/api/ai";
 }
 return "https://api.anthropic.com/v1/messages";
}

// GSA-based per diem rates (hotel + meals, $/day/person) by city keyword
var PER_DIEM_RATES = [
 { keys: ["dallas", "fort worth", "arlington", "plano", "frisco", "mckinney", "allen", "irving", "garland", "richardson", "carrollton", "lewisville", "flower mound", "denton", "mesquite", "grand prairie", "coppell", "grapevine", "southlake", "colleyville", "keller", "euless", "bedford", "hurst", "north richland hills", "mansfield", "cedar hill", "desoto", "duncanville", "lancaster", "prosper", "celina", "anna", "melissa", "little elm", "the colony", "rockwall", "rowlett", "wylie", "murphy", "sachse", "forney", "fate", "royse city", "heath", "sunnyvale", "caddo mills", "midlothian", "waxahachie", "burleson"], rate: 161 },
 { keys: ["houston", "sugar land", "pearland", "katy", "the woodlands", "conroe"], rate: 164 },
 { keys: ["austin", "round rock", "georgetown", "cedar park"], rate: 173 },
 { keys: ["san antonio"], rate: 141 },
 { keys: ["el paso"], rate: 120 },
 { keys: ["corpus christi"], rate: 118 },
 { keys: ["lubbock"], rate: 112 },
 { keys: ["amarillo"], rate: 112 },
 { keys: ["midland", "odessa"], rate: 139 },
 { keys: ["waco", "temple", "killeen"], rate: 115 },
 { keys: ["college station"], rate: 115 },
 { keys: ["beaumont"], rate: 112 },
 { keys: ["tyler", "longview"], rate: 112 },
 { keys: ["abilene"], rate: 109 },
 { keys: ["laredo", "mcallen"], rate: 112 },
 { keys: ["oklahoma city", "norman", "edmond"], rate: 137 },
 { keys: ["tulsa", "broken arrow"], rate: 129 },
 { keys: ["new orleans"], rate: 184 },
 { keys: ["baton rouge"], rate: 129 },
 { keys: ["shreveport"], rate: 112 },
 { keys: ["little rock"], rate: 120 },
 { keys: ["fayetteville", "bentonville", "fort smith"], rate: 119 },
 { keys: ["memphis"], rate: 137 },
 { keys: ["nashville"], rate: 182 },
 { keys: ["atlanta"], rate: 181 },
 { keys: ["birmingham"], rate: 133 },
 { keys: ["charlotte"], rate: 150 },
 { keys: ["chicago"], rate: 217 },
 { keys: ["denver"], rate: 194 },
 { keys: ["phoenix"], rate: 168 },
 { keys: ["kansas city"], rate: 147 },
 { keys: ["jacksonville"], rate: 142 },
 { keys: ["tampa", "st. petersburg", "clearwater", "lakeland"], rate: 157 },
 { keys: ["orlando", "kissimmee", "daytona", "ocala"], rate: 166 },
 { keys: ["miami", "fort lauderdale", "west palm beach", "boca raton", "pompano", "hollywood"], rate: 196 },
 { keys: ["sarasota", "bradenton"], rate: 155 },
 { keys: ["fort myers", "naples", "cape coral"], rate: 165 },
 { keys: ["pensacola"], rate: 126 },
 { keys: ["tallahassee"], rate: 122 },
 { keys: ["gainesville"], rate: 125 },
 { keys: ["panama city"], rate: 135 },
 { keys: ["mobile"], rate: 120 },
 { keys: ["montgomery"], rate: 115 },
 { keys: ["huntsville"], rate: 138 },
 { keys: ["tuscaloosa"], rate: 112 },
 { keys: ["jackson", "hattiesburg"], rate: 112 },
 { keys: ["gulfport", "biloxi"], rate: 121 },
 { keys: ["savannah"], rate: 150 },
 { keys: ["augusta"], rate: 120 },
 { keys: ["macon", "columbus"], rate: 112 },
 { keys: ["charleston"], rate: 161 },
 { keys: ["columbia"], rate: 126 },
 { keys: ["greenville", "spartanburg"], rate: 130 },
 { keys: ["raleigh", "durham"], rate: 148 }
];
var DEFAULT_PER_DIEM = CONFIG.DEFAULT_PER_DIEM;
function getPerDiemRate(cityName) {
 var cn = (cityName || "").toLowerCase();
 for (var i = 0; i < PER_DIEM_RATES.length; i++) {
  for (var j = 0; j < PER_DIEM_RATES[i].keys.length; j++) {
   if (cn.indexOf(PER_DIEM_RATES[i].keys[j]) >= 0) { return PER_DIEM_RATES[i].rate; }
  }
 }
 return DEFAULT_PER_DIEM;
}
var CREW_SIZE = CONFIG.CREW_SIZE; // 1 lead + 3 techs per crew
function estCrews(sf) {
 if (sf <= 0) { return 0; }
 if (sf <= 30000) { return 1; }
 if (sf <= 75000) { return 2; }
 if (sf <= 150000) { return 3; }
 if (sf <= 300000) { return 4; }
 if (sf <= 500000) { return 5; }
 return Math.ceil(sf / 100000);
}

function FLCEstimator() {
 var [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
 useEffect(function() {
  function handleResize() { setIsMobile(window.innerWidth < 768); }
  window.addEventListener("resize", handleResize);
  return function() { window.removeEventListener("resize", handleResize); };
 }, []);
 var fileRef = useRef(null);
 var [step, setStep] = useState(0);
 var [proj, sP] = useState({ name: "", client: "", bt: "", sf: "", baseMob: 900, city: "", miles: 0, msa: false, extSF: "", extTire: false, winEnabled: false, winPanes: "", winHeight: "standard", winSeparate: true, crewSize: "", perDiemRate: "", perDiemOverride: false, perDiemReason: "", tierReason: "", daysOverride: "", notes: "" });
 var [sel, sSel] = useState(["preEquip", "prePunch", "final", "go"]);
 var [clientMatch, sCm] = useState(null);
 var [cityResults, sCr] = useState([]);
 var [showCityDrop, sShowCD] = useState(false);
 var [showMilesInput, sShowMilesInput] = useState(false);
 var [imgs, sImgs] = useState([]);
 var [extracting, sExtracting] = useState(false);
 var [reviewView, sReviewView] = useState("summary");
 var [extractErr, sExtractErr] = useState("");
 var [areas, sAreas] = useState([]);
 var [tier, sTier] = useState(3);
 var [surch, sSurch] = useState({});
 var [scope, sScope] = useState("");
 var [scopeGT, sScopeGT] = useState(0); // GT at time scope was generated
 var [scopeEdit, sScopeEdit] = useState(false); // Edit mode toggle
 var [scopeL, sScopeL] = useState(false);
 var [scopeErr, sScopeErr] = useState("");
 var [showComparison, sShowComparison] = useState(false);
 var [dupeResults, sDupeResults] = useState(null);
 var [savedList, sSavedList] = useState([]);
 var [showSaveLoad, sShowSaveLoad] = useState(false);
 var [saveMsg, sSaveMsg] = useState("");
 var [copyToast, sCopyToast] = useState("");
 var [coMode, sCoMode] = useState(false);
 var [coOriginal, sCoOriginal] = useState(null);
 var [coReason, sCoReason] = useState("");
 var [showDashboard, sShowDashboard] = useState(false);

 // Load saved project list from localStorage on mount
 useEffect(function() {
  try {
   var keys = [];
   for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.startsWith("flc_est_")) { keys.push(k.replace("flc_est_", "")); }
   }
   keys.sort();
   sSavedList(keys);
  } catch(e) {}
 }, []);

 function saveProject(name) {
  if (!name) { return; }
  try {
   // Load existing data to get version history
   var existing = null;
   try { var raw = localStorage.getItem("flc_est_" + name); if (raw) { existing = JSON.parse(raw); } } catch(e) {}
   var versions = (existing && Array.isArray(existing.versions)) ? existing.versions : [];
   var curPr = getPricing();
   versions.push({ v: versions.length + 1, ts: new Date().toISOString(), gt: curPr ? curPr.gt : 0, tier: tier, tierName: TIERS[tier], stages: sel.length, sf: activeSF, note: proj.tierReason || "" });
   if (versions.length > 50) { versions = versions.slice(versions.length - 50); }
   var data = { proj: proj, sel: sel, areas: areas, tier: tier, surch: surch, scope: scope, step: step, ts: new Date().toISOString(), versions: versions };
   localStorage.setItem("flc_est_" + name, JSON.stringify(data));
   sSavedList(function(prev) { var nxt = prev.filter(function(n) { return n !== name; }); nxt.push(name); nxt.sort(); return nxt; });
   sSaveMsg("Saved ✓ (v" + versions.length + ")");
   setTimeout(function() { sSaveMsg(""); }, 2000);
  } catch(e) { sSaveMsg("Save failed: " + e.message); }
 }

 function loadProject(name) {
  autoSaveCurrent();
  try {
   var raw = localStorage.getItem("flc_est_" + name);
   if (!raw) { return; }
   var data = JSON.parse(raw);
   // Merge with defaults so new fields don't become undefined
   var defaults = { name: "", client: "", bt: "", sf: "", baseMob: 900, city: "", miles: 0, msa: false, extSF: "", extTire: false, winEnabled: false, winPanes: "", winHeight: "standard", winSeparate: true, crewSize: "", perDiemRate: "", perDiemOverride: false, perDiemReason: "", tierReason: "", daysOverride: "", notes: "" };
   if (data.proj) { var merged = {}; for (var dk in defaults) { if (defaults.hasOwnProperty(dk)) { merged[dk] = (data.proj.hasOwnProperty(dk) ? data.proj[dk] : defaults[dk]); } } sP(merged); }
   if (data.sel) { sSel(Array.isArray(data.sel) ? data.sel.filter(function(s) { return typeof s === "string"; }) : ["preEquip", "prePunch", "final", "go"]); }
   if (data.areas) { sAreas(Array.isArray(data.areas) ? data.areas.filter(function(a) { return typeof a === "object" && a !== null && !Array.isArray(a); }) : []); }
   if (data.tier !== undefined) { sTier(typeof data.tier === "number" && data.tier >= 0 && data.tier <= 5 ? data.tier : 3); }
   if (data.surch) { sSurch(typeof data.surch === "object" && data.surch !== null && !Array.isArray(data.surch) ? data.surch : {}); }
   sScope(""); // Clear stale scope — regenerate fresh with current template
   sScopeGT(0);
   sScopeEdit(false);
   sScopeErr("");
   sScopeL(false);
   sImgs([]); // Clear stale drawings from prior project
   sExtracting(false);
   sExtractErr("");
   sReviewView("summary");
   sShowComparison(false);
   sShowMilesInput(false);
   sCr([]);
   sShowCD(false);
   sCopyToast("");
   sConfirmDel(null);
   sDupeResults(null);
   sCoMode(false);
   sCoOriginal(null);
   sCoReason("");
   sShowDashboard(false);
   if (data.step !== undefined) { setStep(data.step); }
   sShowSaveLoad(false);
   // Re-trigger client match
   var cn = data.proj ? data.proj.client : "";
   var found = CLIENTS.find(function(c) { return c.name.toLowerCase() === cn.toLowerCase(); });
   sCm(found || null);
  } catch(e) { sSaveMsg("Load failed: " + e.message); }
 }

 function deleteProject(name) {
  try {
   localStorage.removeItem("flc_est_" + name);
   sSavedList(function(prev) { return prev.filter(function(n) { return n !== name; }); });
  } catch(e) {}
 }

 function duplicateProject(name) {
  try {
   var raw = localStorage.getItem("flc_est_" + name);
   if (!raw) { return; }
   var data = JSON.parse(raw);
   var copyName = name + " (Copy)";
   var n = 2;
   while (localStorage.getItem("flc_est_" + copyName)) { copyName = name + " (Copy " + n + ")"; n++; }
   if (data.proj) { data.proj.name = copyName; }
   if (data.versions) { data.versions = []; }
   data.ts = new Date().toISOString();
   localStorage.setItem("flc_est_" + copyName, JSON.stringify(data));
   sSavedList(function(prev) { var nxt = prev.slice(); nxt.push(copyName); nxt.sort(); return nxt; });
   sSaveMsg("Duplicated → " + copyName);
   setTimeout(function() { sSaveMsg(""); }, 2500);
  } catch(e) { sSaveMsg("Duplicate failed"); }
 }
 var [confirmDel, sConfirmDel] = useState(null);

 function exportBackup() {
  try {
   var backup = {};
   for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.startsWith("flc_est_")) {
     backup[k] = JSON.parse(localStorage.getItem(k));
    }
   }
   var json = JSON.stringify(backup, null, 2);
   var blob = new Blob([json], { type: "application/json" });
   var url = URL.createObjectURL(blob);
   var a = document.createElement("a");
   a.href = url;
   a.download = "FLC_Backup_" + new Date().toISOString().slice(0, 10) + ".json";
   a.click();
   URL.revokeObjectURL(url);
   sSaveMsg("Backup downloaded ✓");
   setTimeout(function() { sSaveMsg(""); }, 2000);
  } catch(e) { sSaveMsg("Backup failed: " + e.message); }
 }
 var importRef = useRef(null);
 function importBackup(e) {
  var file = e.target.files && e.target.files[0];
  if (!file) { return; }
  // Reject files over 10MB
  if (file.size > 10 * 1024 * 1024) { sSaveMsg("File too large (max 10MB)"); return; }
  var reader = new FileReader();
  reader.onload = function() {
   try {
    var data = JSON.parse(reader.result);
    if (typeof data !== "object" || data === null || Array.isArray(data)) { sSaveMsg("Invalid backup format"); return; }
    var count = 0;
    var validKeys = Object.keys(data).filter(function(k) { return typeof k === "string" && k.startsWith("flc_est_") && k.length < 200; });
    if (validKeys.length > 500) { sSaveMsg("Too many projects (max 500)"); return; }
    validKeys.forEach(function(k) {
     var proj = data[k];
     // Basic shape validation: must be an object with expected fields
     if (typeof proj !== "object" || proj === null || Array.isArray(proj)) { return; }
     // Reject oversized individual projects (>500KB serialized)
     var serialized = JSON.stringify(proj);
     if (serialized.length > 500 * 1024) { return; }
     localStorage.setItem(k, serialized);
     count++;
    });
    // Refresh saved list
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
     var lk = localStorage.key(i);
     if (lk && lk.startsWith("flc_est_")) { keys.push(lk.replace("flc_est_", "")); }
    }
    keys.sort();
    sSavedList(keys);
    sSaveMsg("Imported " + count + " project" + (count !== 1 ? "s" : "") + " ✓");
    setTimeout(function() { sSaveMsg(""); }, 3000);
   } catch(err) { sSaveMsg("Import failed: " + err.message); }
  };
  reader.readAsText(file);
  e.target.value = "";
 }

 function autoSaveCurrent() {
  // If current project has a name and data, auto-save before switching
  if (proj.name && (areas.length > 0 || proj.bt)) {
   try {
    var data = { proj: proj, sel: sel, areas: areas, tier: tier, surch: surch, scope: scope, step: step, ts: new Date().toISOString() };
    localStorage.setItem("flc_est_" + proj.name, JSON.stringify(data));
    sSavedList(function(prev) { var nxt = prev.filter(function(n) { return n !== proj.name; }); nxt.push(proj.name); nxt.sort(); return nxt; });
   } catch(e) {}
  }
 }

 function newProject() {
  autoSaveCurrent();
  sP({ name: "", client: "", bt: "", sf: "", baseMob: 900, city: "", miles: 0, msa: false, extSF: "", extTire: false, winEnabled: false, winPanes: "", winHeight: "standard", winSeparate: true, crewSize: "", perDiemRate: "", perDiemOverride: false, perDiemReason: "", tierReason: "", daysOverride: "", notes: "" });
  sSel(["preEquip", "prePunch", "final", "go"]);
  sCm(null);
  sCr([]);
  sShowCD(false);
  sAreas([]);
  sTier(3);
  sSurch({});
  sScope("");
  sScopeGT(0);
  sScopeEdit(false);
  sScopeErr("");
  sScopeL(false);
  sImgs([]);
  sExtracting(false);
  sExtractErr("");
  sReviewView("summary");
  sShowComparison(false);
  sShowMilesInput(false);
  sDupeResults(null);
  setStep(0);
  sShowSaveLoad(false);
  sSaveMsg("");
  sCopyToast("");
  sConfirmDel(null);
  sCoMode(false);
  sCoOriginal(null);
  sCoReason("");
  sShowDashboard(false);
 }

 var numMobs = sel.length;
 var stc = sel.length;

 function setField(field, val) {
  sP(function(prev) { var n = {}; for (var k in prev) { n[k] = prev[k]; } n[field] = val; return n; });
 }
 function onClient(v) {
  setField("client", v);
  var match = CLIENTS.find(function(c) { return c.name.toLowerCase() === v.toLowerCase(); });
  sCm(match || null);
  if (match) {
   sP(function(prev) { var n = {}; for (var k in prev) { n[k] = prev[k]; } n.client = v; n.bt = match.def; n.msa = match.msa; return n; });
  }
 }
 function onCity(v) {
  setField("city", v);
  var r = findCities(v);
  sCr(r);
  sShowCD(r.length > 0 && v.length >= 2);
 }
 function pickCity(c) {
  var pdRate = getPerDiemRate(c.n);
  sP(function(prev) { var n = {}; for (var k in prev) { n[k] = prev[k]; } n.city = c.n; n.miles = calcMiles(c.la, c.lo); n.perDiemRate = pdRate; return n; });
  sShowCD(false);
 }
 function toggleStage(id) {
  sSel(function(prev) {
   if (prev.indexOf(id) >= 0) { return prev.filter(function(s) { return s !== id; }); }
   return prev.concat([id]);
  });
 }
 function resizeImage(dataUrl, maxDim) {
  return new Promise(function(resolve) {
   var img = new Image();
   img.onload = function() {
    var w = img.width; var h = img.height;
    if (w <= maxDim && h <= maxDim) { resolve(dataUrl); return; }
    var scale = Math.min(maxDim / w, maxDim / h);
    var nw = Math.round(w * scale); var nh = Math.round(h * scale);
    var canvas = document.createElement("canvas");
    canvas.width = nw; canvas.height = nh;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, nw, nh);
    resolve(canvas.toDataURL("image/jpeg", 0.85));
   };
   img.onerror = function() { resolve(dataUrl); };
   img.src = dataUrl;
  });
 }
 function loadPdfJs() {
  if (window.pdfjsLib) { return Promise.resolve(window.pdfjsLib); }
  return new Promise(function(resolve, reject) {
   var script = document.createElement("script");
   script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
   script.crossOrigin = "anonymous";
   script.onload = function() {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    resolve(window.pdfjsLib);
   };
   script.onerror = function() { reject(new Error("Failed to load PDF.js")); };
   document.head.appendChild(script);
  });
 }
 function splitPdfToImages(file) {
  return new Promise(function(resolve) {
   var reader = new FileReader();
   reader.onload = function() {
    var arrayBuf = reader.result;
    loadPdfJs().then(function(pdfjsLib) {
     return pdfjsLib.getDocument({ data: arrayBuf }).promise;
    }).then(function(pdf) {
     var pages = [];
     var total = pdf.numPages;
     sExtractErr("Splitting " + file.name + " — " + total + " pages...");
     function renderPage(num) {
      if (num > total) { resolve(pages); return; }
      sExtractErr("Rendering page " + num + " of " + total + "...");
      pdf.getPage(num).then(function(page) {
       var scale = 2.0;
       var viewport = page.getViewport({ scale: scale });
       var canvas = document.createElement("canvas");
       canvas.width = viewport.width;
       canvas.height = viewport.height;
       var ctx = canvas.getContext("2d");
       return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function() {
        var dataUrl = canvas.toDataURL("image/jpeg", 0.90);
        var base64 = dataUrl.split(",")[1];
        var sizeMB = (base64.length * 0.75 / (1024 * 1024)).toFixed(1);
        pages.push({
         name: file.name.replace(".pdf", "") + " — p" + num,
         data: base64,
         type: "image/jpeg",
         isPDF: false,
         preview: dataUrl,
         sizeMB: sizeMB
        });
        renderPage(num + 1);
       });
      });
     }
     renderPage(1);
    }).catch(function() {
     // Fallback: send whole PDF as-is
     var fr2 = new FileReader();
     fr2.onload = function() {
      resolve([{ name: file.name, data: fr2.result.split(",")[1], type: "application/pdf", isPDF: true, preview: null, sizeMB: (file.size / (1024 * 1024)).toFixed(1) }]);
     };
     fr2.readAsDataURL(file);
    });
   };
   reader.readAsArrayBuffer(file);
  });
 }
 function handleFiles(e) {
  var files = Array.from(e.target.files);
  sExtractErr("Loading " + files.length + " file" + (files.length > 1 ? "s" : "") + "...");
  var allPromises = files.map(function(f) {
   if (f.type === "application/pdf") {
    return splitPdfToImages(f);
   }
   return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function() {
     resizeImage(reader.result, 2048).then(function(resized) {
      var resizedBase64 = resized.split(",")[1];
      var resizedType = resized.startsWith("data:image/jpeg") ? "image/jpeg" : f.type;
      var resizedSize = (resizedBase64.length * 0.75 / (1024 * 1024)).toFixed(1);
      resolve([{ name: f.name, data: resizedBase64, type: resizedType, isPDF: false, preview: resized, sizeMB: resizedSize }]);
     });
    };
    reader.readAsDataURL(f);
   });
  });
  Promise.all(allPromises).then(function(results) {
   var flat = [];
   results.forEach(function(r) { flat = flat.concat(r); });
   sImgs(function(prev) { return prev.concat(flat); });
   sExtractErr("Loaded " + flat.length + " page" + (flat.length > 1 ? "s" : "") + " — ready to extract.");
  });
 }
 function repairJSON(raw) {
  var cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  var si = cleaned.indexOf("[");
  if (si < 0) { return null; }
  var ei = cleaned.lastIndexOf("]");
  if (ei > si) { cleaned = cleaned.substring(si, ei + 1); }
  else {
   cleaned = cleaned.substring(si);
   var lastBrace = cleaned.lastIndexOf("}");
   if (lastBrace > 0) {
    cleaned = cleaned.substring(0, lastBrace + 1);
    var trail = cleaned.replace(/,\s*$/, "");
    cleaned = trail + "]";
   } else { return null; }
  }
  cleaned = cleaned.replace(/,\s*,/g, ",").replace(/,\s*\]/g, "]").replace(/\}\s*\{/g, "},{");
  try { return JSON.parse(cleaned); } catch(e) {}
  try {
   cleaned = cleaned.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
   cleaned = cleaned.replace(/:\s*'([^']*)'/g, ':"$1"');
   return JSON.parse(cleaned);
  } catch(e2) { return null; }
 }
 function expandFloorRanges(areas) {
  var expanded = [];
  areas.forEach(function(a) {
   var fl = (a.floor || "").replace(/\s+/g, "");
   var rangeMatch = fl.match(/^([A-Za-z]*)(\d+)\s*[-–]\s*(\d+)$/);
   if (rangeMatch) {
    var prefix = rangeMatch[1] || "L";
    var lo = parseInt(rangeMatch[2]);
    var hi = parseInt(rangeMatch[3]);
    if (hi > lo && (hi - lo) < 200) {
     for (var lv = lo; lv <= hi; lv++) {
      var copy = {};
      for (var k in a) { copy[k] = a[k]; }
      copy.floor = prefix + lv;
      expanded.push(copy);
     }
     return;
    }
   }
   var rangeMatch2 = fl.match(/^([A-Za-z]*\s*)(\d+)\s*[-–]\s*([A-Za-z]*)(\d+)$/);
   if (rangeMatch2) {
    var prefix2 = rangeMatch2[1] || rangeMatch2[3] || "L";
    var lo2 = parseInt(rangeMatch2[2]);
    var hi2 = parseInt(rangeMatch2[4]);
    if (hi2 > lo2 && (hi2 - lo2) < 200) {
     for (var lv2 = lo2; lv2 <= hi2; lv2++) {
      var copy2 = {};
      for (var k2 in a) { copy2[k2] = a[k2]; }
      copy2.floor = prefix2 + lv2;
      expanded.push(copy2);
     }
     return;
    }
   }
   expanded.push(a);
  });
  return expanded;
 }
 function callExtract(contentArr) {
  var prompt = 'Analyze these construction floor plans/drawings. Extract ALL rooms/areas from every page/sheet. Read square footage values EXACTLY as printed on the plans — do not estimate, round, or calculate. If an SF value is shown as "11,809" return 11809. If no SF is labeled for a room, use 0. IMPORTANT: If a sheet covers multiple levels (e.g. "Level 6-10" or "L14-17"), keep the floor label exactly as shown (e.g. "L6-10") — I will expand it. Return ONLY a JSON array, no other text. Keep area names short (max 20 chars). Format: [{"floor":"L6-10","area":"Hotel Room","sf":11809,"floorType":"Carpet","special":"none"}]. Use special:"exterior" for outdoor ground-level areas like parking lots, parking garages, sidewalks, walkways, driveways, basketball courts. Balconies above ground level are interior, NOT exterior. Rooftop pools/decks are interior. No markdown, no explanation.';
  return fetch(getAIEndpoint(), {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8000, temperature: 0, messages: [{ role: "user", content: contentArr.concat([{ type: "text", text: prompt }]) }] })
  }).then(function(resp) {
   if (!resp.ok) { throw new Error("API error " + resp.status); }
   return resp.json();
  }).then(function(data) {
   var text = "";
   if (data.content) {
    for (var i = 0; i < data.content.length; i++) {
     if (data.content[i].text) { text = text + data.content[i].text; }
    }
   }
   var parsed = repairJSON(text);
   if (!parsed || !Array.isArray(parsed)) { return []; }
   // Sanitize: ensure each area has expected shape with safe types
   return parsed.map(function(a) {
    if (typeof a !== "object" || a === null) { return null; }
    return {
     floor: String(a.floor || "Level 1").substring(0, 200),
     area: String(a.area || "Area").substring(0, 200),
     sf: Math.max(0, parseInt(a.sf) || 0),
     floorType: String(a.floorType || "TBD").substring(0, 100),
     special: String(a.special || "none").substring(0, 100),
     zone: (a.zone === "exterior") ? "exterior" : "interior"
    };
   }).filter(function(a) { return a !== null; });
  });
 }
 function extractData() {
  if (imgs.length === 0) { return; }
  sExtracting(true);
  sExtractErr("Processing " + imgs.length + " file" + (imgs.length > 1 ? "s" : "") + "...");
  // Always process individually in parallel — faster than one mega-call
  var allAreas = [];
  var errors = [];
  var idx = 0;
  var PARALLEL = 3;
  function nextBatch() {
   if (idx >= imgs.length) {
    sExtracting(false);
    if (allAreas.length > 0) {
     var finalAreas = autoClassifyAreas(expandFloorRanges(allAreas));
     sAreas(finalAreas);
     // Auto-check for duplicates
     setTimeout(function() { sDupeResults(getDuplicateWarnings()); }, 100);
     var expandNote = finalAreas.length > allAreas.length ? " (expanded " + allAreas.length + " → " + finalAreas.length + " with floor ranges)" : "";
     if (errors.length > 0) { sExtractErr("Processed " + imgs.length + " files (" + finalAreas.length + " areas" + expandNote + "). Issues with: " + errors.join(", ")); }
     else { sExtractErr("Processed " + imgs.length + " files — " + finalAreas.length + " total areas" + expandNote + "."); }
    } else {
     sExtractErr("Could not extract from any file. Edit manually.");
     sAreas([{ floor: "Level 1", area: "Main Area", sf: parseInt(proj.sf) || 10000, floorType: "TBD", special: "none", zone: "interior" }]);
    }
    setStep(2);
    return;
   }
   var batch = [];
   while (batch.length < PARALLEL && idx < imgs.length) {
    batch.push({ img: imgs[idx], fileIdx: idx });
    idx++;
   }
   sExtractErr("Analyzing " + (imgs.length === 1 ? imgs[0].name : ("files " + batch.map(function(b) { return b.fileIdx + 1; }).join(", ") + " of " + imgs.length)) + "...");
   Promise.all(batch.map(function(b) {
    var content;
    if (b.img.isPDF) {
     content = [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: b.img.data } }];
    } else {
     content = [{ type: "image", source: { type: "base64", media_type: b.img.type, data: b.img.data } }];
    }
    return callExtract(content).then(function(parsed) {
     if (parsed.length > 0) {
      parsed.forEach(function(a) { a.floor = a.floor || ("File " + (b.fileIdx + 1)); });
      allAreas = allAreas.concat(parsed);
     }
     else { errors.push(b.img.name); }
    }).catch(function() { errors.push(b.img.name); });
   })).then(nextBatch);
  }
  nextBatch();
 }
 function getMob() {
  var mi = proj.miles || 0;
  var trips = numMobs;
  var rt = mi * 2;
  var mpt = rt * CONFIG.MILEAGE_RATE;
  var tmil = mpt * trips;
  var base = proj.baseMob || 900;
  return { base: base, miles: mi, trips: trips, rt: rt, mpt: mpt, tmil: tmil, total: base + tmil };
 }
 function getPricing() {
  var sf = activeSF;
  if (!sf || !proj.bt || sel.length === 0) { return null; }
  var rate = lookupRate(proj.bt, sf, stc, tier);
  if (!rate) { return null; }
  var bt = sf * rate;
  var mc = getMob();
  var extManual = parseInt(proj.extSF) || 0;
  var extSF = exteriorSF > 0 ? exteriorSF + extManual : extManual;
  var extRate = 0.30;
  for (var eb = 0; eb < CONFIG.EXT_BANDS.length; eb++) { if (extSF >= CONFIG.EXT_BANDS[eb][0] && extSF <= CONFIG.EXT_BANDS[eb][1]) { extRate = CONFIG.EXT_BANDS[eb][2]; break; } }
  var extBase = extSF * extRate;
  var extTire = proj.extTire ? extSF * CONFIG.EXT_TIRE_ADDON : 0;
  var extTotal = extBase + extTire;
  var winPanes = proj.winEnabled ? (parseInt(proj.winPanes) || 0) : 0;
  var winRate = CONFIG.WIN_TIERS[proj.winHeight] || CONFIG.WIN_TIERS.standard;
  var winTotal = winPanes * winRate;
  var winSeparate = proj.winSeparate;
  var winBundledPerSF = (!winSeparate && winTotal > 0 && sf > 0) ? (winTotal / sf) : 0;
  var st = 0;
  var surchBase = bt + extBase + (winSeparate ? winTotal : 0);
  Object.keys(surch).forEach(function(k) { if (surch[k] > 0) { st = st + surchBase * (surch[k] / 100); } });
  var baseGt = bt + st + mc.total + extTotal + (winSeparate ? winTotal : 0);
  var useW4 = stc >= 4 || sel.includes("go");
  var ws = 0;
  sel.forEach(function(id) { var x = ALL_STAGES.find(function(y) { return y.id === id; }); ws = ws + (useW4 ? x.w4 : x.w3); });
  var br = {};
  sel.forEach(function(id) { var x = ALL_STAGES.find(function(y) { return y.id === id; }); br[id] = ws > 0 ? bt * ((useW4 ? x.w4 : x.w3) / ws) : 0; });
  var prodRate = CONFIG.PROD_RATES[proj.bt] || 2500;
  var cd = sf / prodRate;
  var crews = parseInt(proj.crewSize) > 0 ? parseInt(proj.crewSize) : estCrews(sf);
  var headcount = crews * CREW_SIZE;
  var estDays = crews > 0 ? Math.ceil(cd / (crews * CREW_SIZE)) : 0;
  var projDays = parseInt(proj.daysOverride) > 0 ? parseInt(proj.daysOverride) : estDays;
  var perDiemRate = parseFloat(proj.perDiemRate) > 0 ? parseFloat(proj.perDiemRate) : (proj.city ? getPerDiemRate(proj.city) : 0);
  var perDiemApplies = (projDays > CONFIG.PER_DIEM_THRESHOLD || proj.perDiemOverride) && headcount > 0 && perDiemRate > 0;
  var perDiemTotal = perDiemApplies ? headcount * perDiemRate * projDays : 0;
  var gt = baseGt + perDiemTotal;
  var ar = [];
  for (var t = 0; t < 6; t++) {
   var r = lookupRate(proj.bt, sf, stc, t);
   if (r) { ar.push({ tier: TIERS[t], rate: r, total: sf * r, sel: t === tier }); }
  }
  return { rate: rate, bt: bt, st: st, mob: mc, extSF: extSF, extRate: extRate, extBase: extBase, extTire: extTire, extTotal: extTotal, winPanes: winPanes, winRate: winRate, winTotal: winTotal, winSeparate: winSeparate, winBundledPerSF: winBundledPerSF, gt: gt, baseGt: baseGt, br: br, cd: cd, crews: crews, headcount: headcount, estDays: estDays, projDays: projDays, perDiemRate: perDiemRate, perDiemApplies: perDiemApplies, perDiemTotal: perDiemTotal, ar: ar, sf: sf };
 }
 var STAGE_GC_NAMES = {
  preEquip: "Pre-Equipment Cleaning (Initial Clean)",
  prePunch: "Pre-Punchlist Deep Clean (Final Clean)",
  final: "Post-Construction Final Clean (Fluff Clean)",
  go: "VIP / Grand Opening Clean"
 };
 var BT_PROTOCOLS = {
  hospital: { label: "HEALTHCARE FACILITY PROTOCOLS", items: [
   "Infection Control Awareness: All cleaning conducted with awareness of healthcare environmental standards. Cross-contamination prevention through dedicated tools per zone.",
   "Surgical / Procedure Room Prep: HEPA-filtered vacuum systems used in surgical suites, procedure rooms, and sterile corridors. Surfaces wiped with healthcare-grade solutions.",
   "Biohazard Awareness: Team trained to identify and avoid biohazard risk areas. No cleaning inside bio-containment zones unless specifically scoped and approved.",
   "Air Quality Support: Overhead-to-floor sequencing reduces airborne particulate. Duct-adjacent surfaces cleaned to support HVAC commissioning.",
   "Pharmacy / Clean Room Areas: If included in released zones, HEPA protocols and lint-free materials used per facility requirements."
  ]},
  outpatient: { label: "MEDICAL / OUTPATIENT PROTOCOLS", items: [
   "Exam Room Detailing: All exam room surfaces, cabinetry, and fixtures cleaned to healthcare-ready standard. Sinks disinfected.",
   "Infection Control Awareness: Dedicated cleaning materials per zone. No cross-contamination between clinical and non-clinical areas.",
   "Air Quality Support: Overhead-to-floor sequencing to reduce particulate. HEPA vacuum in sensitive areas where specified."
  ]},
  industrial: { label: "INDUSTRIAL / WAREHOUSE PROTOCOLS", items: [
   "Heavy Debris & Equipment Areas: Industrial-grade debris removal including metal shavings, concrete dust, and heavy packaging materials.",
   "Overhead Systems: Cable trays, exposed conduit, and overhead MEP systems cleaned using extension poles and HEPA vacuum.",
   "Concrete Floor Systems: Mechanical scrubbing of sealed and unsealed concrete. Adhesive and coating removal as needed.",
   "High-Bay & Mezzanine Areas: Accessible elevated surfaces cleaned. Safety protocols observed for height work."
  ]},
  restaurant: { label: "FOOD SERVICE / RESTAURANT PROTOCOLS", items: [
   "Kitchen & Prep Area Detailing: All stainless steel surfaces, prep tables, and equipment exteriors cleaned and polished. Interior cleaning of non-installed equipment where accessible.",
   "Health Code Readiness: Surfaces cleaned to support health department inspection readiness. Grease, adhesive, and construction residue fully removed from food-contact-adjacent areas.",
   "Hood & Exhaust Systems: Exterior surfaces of hood systems cleaned. Interior hood cleaning excluded unless specifically scoped.",
   "Floor Drains: Construction debris removed from accessible floor drains. Drain interiors excluded unless scoped."
  ]},
  gym: { label: "FITNESS / RECREATION FACILITY PROTOCOLS", items: [
   "Equipment Area Prep: All surfaces where fitness equipment will be installed cleaned and free of debris, adhesive, and dust.",
   "Rubber / Sport Flooring: Specialized cleaning protocols for rubber, sport court, and resilient flooring systems. Mechanical scrub with appropriate solutions.",
   "Locker Room Detailing: Full restroom protocol applied to locker rooms including shower stalls, benches, drains, and partition systems.",
   "Natatorium / Pool Areas: If included, deck surfaces cleaned. Chemical storage areas excluded."
  ]},
  dealership: { label: "AUTOMOTIVE / SHOWROOM PROTOCOLS", items: [
   "Showroom Presentation: Glass-heavy showroom areas cleaned to executive presentation standard. All interior glazing, storefronts, and display areas detailed.",
   "Service Bay Prep: Concrete floors mechanically scrubbed. Overhead door tracks and frame systems cleaned where accessible.",
   "Detail Bays: Walls, floors, and fixtures cleaned. Drain systems cleared of construction debris."
  ]},
  university: { label: "EDUCATION FACILITY PROTOCOLS", items: [
   "Classroom & Lab Prep: All classroom surfaces, built-in cabinetry, and lab stations cleaned. Chemical fume hoods exterior surfaces cleaned where accessible.",
   "Common Area Presentation: High-traffic corridors, lobbies, and student areas cleaned to move-in standard.",
   "Auditorium / Assembly: Seating areas vacuumed and wiped. Stage areas and AV equipment exteriors cleaned."
  ]},
  big_box: { label: "RETAIL FACILITY PROTOCOLS", items: [
   "Sales Floor Prep: Large open floor areas mechanically scrubbed. Shelving and fixture bases cleaned.",
   "Stockroom / Receiving: Back-of-house areas cleared of debris and cleaned to operational standard.",
   "Storefront & Entry: All glass, frames, and entry hardware detailed to customer-facing standard."
  ]},
  small_retail: { label: "RETAIL TENANT IMPROVEMENT PROTOCOLS", items: [
   "Display & Fixture Areas: All surfaces where merchandise fixtures will be installed cleaned and detailed.",
   "Storefront Glass: Full interior and exterior storefront cleaning. Frame and sill detailing.",
   "Back Office / Storage: Support areas cleaned to operational standard."
  ]},
  jail: { label: "CORRECTIONS FACILITY PROTOCOLS", items: [
   "Secure Area Cleaning: All work performed within approved access zones. Security escort compliance as required.",
   "Cell / Housing Unit Prep: Fixtures, built-ins, and surfaces cleaned to occupancy standard. Stainless steel polished.",
   "Hardened Surfaces: Detention-grade fixtures and tamper-resistant hardware cleaned without damage."
  ]},
  police: { label: "LAW ENFORCEMENT FACILITY PROTOCOLS", items: [
   "Secure Area Compliance: All work within approved access zones. Evidence and sensitive area boundaries respected.",
   "Holding / Processing Areas: Surfaces cleaned to operational standard. Fixtures and hardware detailed."
  ]},
  fire: { label: "FIRE STATION PROTOCOLS", items: [
   "Apparatus Bay Prep: Concrete floors mechanically scrubbed. Overhead door systems and tracks cleaned.",
   "Living Quarters: Full residential-standard cleaning of sleeping quarters, kitchen, and common areas.",
   "Training / Equipment Areas: Surfaces cleaned to operational standard."
  ]},
  courthouse: { label: "COURTHOUSE / JUDICIAL PROTOCOLS", items: [
   "Courtroom Presentation: Millwork, bench areas, and gallery seating cleaned to executive standard.",
   "Public Areas: High-traffic corridors, lobbies, and security screening areas detailed.",
   "Chambers & Offices: Full office-standard cleaning with attention to built-in cabinetry and millwork."
  ]},
  muni_admin: { label: "MUNICIPAL ADMINISTRATION PROTOCOLS", items: [
   "Public-Facing Areas: Lobby, service counters, and public meeting spaces cleaned to presentation standard.",
   "Office Suites: Standard commercial office cleaning protocols applied."
  ]},
  event_center: { label: "EVENT CENTER / ASSEMBLY PROTOCOLS", items: [
   "Main Hall Prep: Large-format floor cleaning. Stage areas, rigging access points, and seating areas detailed.",
   "Concession / Kitchen Areas: Food service protocols applied where applicable.",
   "Lobby & Pre-Function: High-visibility entry and gathering spaces cleaned to grand opening standard."
  ]},
  gas_station: { label: "CONVENIENCE STORE / FUEL FACILITY PROTOCOLS", items: [
   "Sales Floor & Cooler Areas: All shelving, cooler exteriors, and point-of-sale areas cleaned and detailed.",
   "Restroom Detailing: Full restroom protocol. Fixtures, partitions, and floors cleaned to public-use standard.",
   "Canopy / Exterior: Fuel island surfaces and canopy columns cleaned where accessible and safe."
  ]},
  renovation: { label: "OCCUPIED / PHASED RENOVATION PROTOCOLS", items: [
   "Dust Migration Control: Containment-adjacent areas monitored. HEPA vacuum at containment boundaries.",
   "Phased Zone Cleaning: Work sequenced per GC release schedule. No entry to occupied or unreleased zones.",
   "Protection of Existing Finishes: Adjacent occupied areas protected from cleaning operations. Existing furniture and equipment protected where in proximity."
  ]}
 };
 function copyText(text) {
  function showToast() { sCopyToast("Copied ✓"); setTimeout(function() { sCopyToast(""); }, 1500); }
  if (navigator.clipboard && window.isSecureContext) {
   navigator.clipboard.writeText(text).then(showToast).catch(function() { fallbackCopy(text); showToast(); });
  } else { fallbackCopy(text); showToast(); }
  function fallbackCopy(t) {
   var ta = document.createElement("textarea");
   ta.value = t;
   ta.style.cssText = "position:fixed;left:-9999px;top:-9999px";
   document.body.appendChild(ta);
   ta.focus(); ta.select();
   try { document.execCommand("copy"); } catch(e) {}
   document.body.removeChild(ta);
  }
 }
 // ═══ CHANGE ORDER ═══
 function startChangeOrder() {
  var pr2 = getPricing();
  if (!pr2) { return; }
  sCoOriginal({
   gt: pr2.gt, rate: pr2.rate, sf: activeSF, bt: proj.bt, tier: tier, tierName: TIERS[tier],
   stages: sel.slice(), stageCount: sel.length, mob: pr2.mob.total, ext: pr2.extTotal,
   win: pr2.winTotal, winSep: pr2.winSeparate, st: pr2.st, pd: pr2.perDiemApplies ? pr2.perDiemTotal : 0,
   areas: areas.map(function(a) { return { name: a.name, sf: a.sf, floor: a.floor, zone: a.zone, floorType: a.floorType }; }),
   ts: new Date().toISOString(), name: proj.name,
   scope: scope || buildScope()
  });
  sCoMode(true);
  sCoReason("");
 }
 function buildChangeOrderText() {
  var pr2 = getPricing();
  if (!pr2 || !coOriginal) { return ""; }
  var delta = pr2.gt - coOriginal.gt;
  var sign = delta >= 0 ? "+" : "";
  var d = new Date();
  var dateStr = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
  var L = [];
  L.push("═══════════════════════════════════════════════════════════");
  L.push("CHANGE ORDER");
  L.push("BLU Crew — Powered by Fresh Local Cleaning");
  L.push("═══════════════════════════════════════════════════════════");
  L.push("");
  L.push("Project: " + proj.name);
  L.push("Client: " + proj.client);
  L.push("Date: " + dateStr);
  L.push("CO Reason: " + (coReason || "N/A"));
  L.push("");
  L.push("─── ORIGINAL ESTIMATE ───");
  L.push("Total: " + fmt(coOriginal.gt));
  L.push("SF: " + fmtN(coOriginal.sf) + " | Tier: " + coOriginal.tierName + " | Stages: " + coOriginal.stageCount);
  L.push("Interior: " + fmt(coOriginal.gt - coOriginal.mob - coOriginal.ext - (coOriginal.winSep ? coOriginal.win : 0) - coOriginal.st - coOriginal.pd));
  if (coOriginal.mob > 0) { L.push("Mobilization: " + fmt(coOriginal.mob)); }
  if (coOriginal.ext > 0) { L.push("Exterior: " + fmt(coOriginal.ext)); }
  if (coOriginal.win > 0) { L.push("Windows: " + fmt(coOriginal.win) + (coOriginal.winSep ? "" : " (bundled)")); }
  if (coOriginal.st > 0) { L.push("Surcharges: " + fmt(coOriginal.st)); }
  if (coOriginal.pd > 0) { L.push("Per Diem: " + fmt(coOriginal.pd)); }
  L.push("");
  L.push("─── REVISED ESTIMATE ───");
  L.push("Total: " + fmt(pr2.gt));
  L.push("SF: " + fmtN(activeSF) + " | Tier: " + TIERS[tier] + " | Stages: " + sel.length);
  L.push("Interior: " + fmt(pr2.bt));
  if (pr2.mob.total > 0) { L.push("Mobilization: " + fmt(pr2.mob.total)); }
  if (pr2.extTotal > 0) { L.push("Exterior: " + fmt(pr2.extTotal)); }
  if (pr2.winTotal > 0) { L.push("Windows: " + fmt(pr2.winTotal) + (pr2.winSeparate ? "" : " (bundled)")); }
  if (pr2.st > 0) { L.push("Surcharges: " + fmt(pr2.st)); }
  if (pr2.perDiemApplies) { L.push("Per Diem: " + fmt(pr2.perDiemTotal)); }
  L.push("");
  L.push("─── CHANGES ───");
  if (activeSF !== coOriginal.sf) { L.push("SF: " + fmtN(coOriginal.sf) + " → " + fmtN(activeSF) + " (" + (activeSF > coOriginal.sf ? "+" : "") + fmtN(activeSF - coOriginal.sf) + ")"); }
  if (tier !== coOriginal.tier) { L.push("Tier: " + coOriginal.tierName + " → " + TIERS[tier]); }
  if (sel.length !== coOriginal.stageCount) { L.push("Stages: " + coOriginal.stageCount + " → " + sel.length); }
  if (Math.abs(pr2.mob.total - coOriginal.mob) > 1) { L.push("Mob: " + fmt(coOriginal.mob) + " → " + fmt(pr2.mob.total)); }
  if (Math.abs(pr2.extTotal - coOriginal.ext) > 1) { L.push("Exterior: " + fmt(coOriginal.ext) + " → " + fmt(pr2.extTotal)); }
  // Area diff
  var origNames = coOriginal.areas.map(function(a) { return a.name + "|" + a.floor; });
  var newNames = areas.map(function(a) { return a.name + "|" + a.floor; });
  var added = newNames.filter(function(n) { return origNames.indexOf(n) < 0; });
  var removed = origNames.filter(function(n) { return newNames.indexOf(n) < 0; });
  if (added.length > 0) { L.push("Added areas: " + added.map(function(a) { return a.split("|")[0]; }).join(", ")); }
  if (removed.length > 0) { L.push("Removed areas: " + removed.map(function(a) { return a.split("|")[0]; }).join(", ")); }
  L.push("");
  L.push("═══════════════════════════════════════════════════════════");
  L.push("NET CHANGE: " + sign + fmt(Math.abs(delta)));
  L.push("REVISED TOTAL: " + fmt(pr2.gt));
  L.push("═══════════════════════════════════════════════════════════");
  L.push("");
  L.push("Authorized By: ___________________________  Date: _________");
  L.push("Printed Name:  ___________________________  Title: ________");
  return L.join("\n");
 }
 // ═══ CLIENT DASHBOARD ═══
 function getClientDashboard() {
  var dashboard = {};
  try {
   for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (!k || !k.startsWith("flc_est_")) { continue; }
    try {
     var data = JSON.parse(localStorage.getItem(k));
     if (!data || !data.proj || !data.proj.client) { continue; }
     var cn = data.proj.client.trim();
     if (!cn) { continue; }
     if (!dashboard[cn]) { dashboard[cn] = { name: cn, projects: [], totalBid: 0, count: 0 }; }
     var prj = data.proj;
     var sf = 0;
     if (data.areas && Array.isArray(data.areas)) {
      data.areas.forEach(function(a) { if (a.zone !== "exterior") { sf += (parseInt(a.sf) || 0); } });
     }
     if (sf === 0) { sf = parseInt(prj.sf) || 0; }
     var tierIdx = typeof data.tier === "number" ? data.tier : 3;
     var vers = data.versions || [];
     var latestGT = vers.length > 0 ? vers[vers.length - 1].gt : 0;
     dashboard[cn].projects.push({
      name: prj.name || k.replace("flc_est_", ""),
      bt: prj.bt ? (P[prj.bt] ? P[prj.bt].name : prj.bt) : "?",
      sf: sf, tier: TIERS[tierIdx] || "?", tierIdx: tierIdx,
      stages: data.sel ? data.sel.length : 0,
      gt: latestGT, city: prj.city || "",
      ts: data.ts || "", versions: vers.length,
      msa: prj.msa || false
     });
     dashboard[cn].totalBid += latestGT;
     dashboard[cn].count++;
    } catch(e) {}
   }
  } catch(e) {}
  return Object.values(dashboard).sort(function(a, b) { return b.totalBid - a.totalBid; });
 }
 function renderFormattedScope(text) {
  if (!text) { return null; }
  var lines = text.split("\n");
  var elements = [];
  var i = 0;
  while (i < lines.length) {
   var line = lines[i];
   // Title line
   if (line.indexOf("BLU STANDARD") === 0) {
    elements.push({ type: "title", text: line });
    i++;
    if (i < lines.length && lines[i].indexOf("Post-Construction") === 0) { elements.push({ type: "subtitle", text: lines[i] }); i++; }
    if (i < lines.length && lines[i].indexOf("===") === 0) { i++; }
    continue;
   }
   // Section dividers — skip
   if (/^[-=]{10,}/.test(line)) { i++; continue; }
   // Markdown headers (AI might use ### or ##)
   if (/^#{1,3}\s+/.test(line)) { elements.push({ type: "section", text: line.replace(/^#{1,3}\s+/, "") }); i++; continue; }
   // TOTAL PROJECT PRICE line (prominent)
   if (line.indexOf("TOTAL PROJECT PRICE") >= 0) { elements.push({ type: "grandtotal", text: line }); i++; continue; }
   // Bid validity line
   if (line.indexOf("This proposal is valid") >= 0) { elements.push({ type: "validity", text: line }); i++; continue; }
   // Signature lines
   if (line.indexOf("___") >= 0) { elements.push({ type: "sigline", text: line }); i++; continue; }
   // PRICING BREAKDOWN header
   if (line.indexOf("PRICING BREAKDOWN") >= 0) { elements.push({ type: "section", text: line }); i++; continue; }
   // Footer
   if (line.indexOf("BLU Crew") === 0 || line.indexOf("Fresh Local Cleaning") === 0 || line.indexOf("Dallas, TX") === 0 || line.indexOf("Caddo Mills") === 0 || (line.indexOf("Generated:") >= 0 && line.indexOf("FLC Estimator") >= 0)) { elements.push({ type: "footer", text: line }); i++; continue; }
   // Numbered section header (e.g. "1. PROJECT SUMMARY")
   if (/^\d+\.\s+[A-Z]/.test(line)) { elements.push({ type: "section", text: line }); i++; continue; }
   // Stage sub-header (e.g. "STAGE — PRE-PUNCHLIST DEEP CLEAN")
   if (line.indexOf("STAGE —") === 0 || line.indexOf("STAGE -") === 0 || /^Stage\s+\d/i.test(line)) { elements.push({ type: "stage", text: line }); i++; continue; }
   // Floor header in zones (e.g. "LEVEL 1 — INTERIOR")
   if (/^[A-Z0-9]/.test(line) && line.indexOf("—") > 0 && line === line.toUpperCase()) { elements.push({ type: "floorhead", text: line }); i++; continue; }
   // Sub-section header (mixed case or all caps, no indent, short-ish, not a KV)
   if (/^[A-Z][A-Za-z &\/,\-()]+$/.test(line.trim()) && line.trim().length < 60 && line.charAt(0) !== " " && line.indexOf(":") < 0) { elements.push({ type: "subsection", text: line }); i++; continue; }
   // Subsection with parenthetical (e.g. "Interior Cleaning (50,000 SF × $1.20/SF)")
   if (/^[A-Z][A-Za-z ]+\(/.test(line.trim()) && line.trim().length < 80 && line.charAt(0) !== " ") { elements.push({ type: "subsection", text: line }); i++; continue; }
   // "Done" means header
   if (line.indexOf('"Done" Means:') >= 0 || line.indexOf("\"Done\" Means:") >= 0) { elements.push({ type: "done", text: line }); i++; continue; }
   // Markdown bold line (AI pattern: "**Header**")
   if (/^\*\*[^*]+\*\*\s*$/.test(line.trim())) { elements.push({ type: "subsection", text: line.replace(/\*\*/g, "") }); i++; continue; }
   // Bullet point (starts with "  •" or "- " or "* ")
   if (/^\s+•/.test(line)) { elements.push({ type: "bullet", text: line.replace(/^\s+•\s*/, "") }); i++; continue; }
   if (/^\s*[-*]\s+/.test(line) && !/^[-]{3,}/.test(line)) { elements.push({ type: "bullet", text: line.replace(/^\s*[-*]\s+/, "") }); i++; continue; }
   // Mob detail line (e.g. "    Mob 1 — Pre-Equipment: ...")
   if (/^\s+Mob\s+\d/.test(line)) { elements.push({ type: "detail", text: line.trim() }); i++; continue; }
   // Indented line (detail item)
   if (/^\s{2,}/.test(line) && line.trim().length > 0) { elements.push({ type: "detail", text: line.trim() }); i++; continue; }
   // Purpose line
   if (line.indexOf("Purpose:") === 0) { elements.push({ type: "purpose", text: line }); i++; continue; }
   // Key-value line (e.g. "Project: ...", "Client: ...", "Interior Subtotal: $...")
   if (/^[A-Z][A-Za-z\s\/&]+:\s/.test(line) && line.indexOf("  ") !== 0) { elements.push({ type: "kv", text: line }); i++; continue; }
   // Empty line
   if (line.trim() === "") { elements.push({ type: "space" }); i++; continue; }
   // Regular paragraph
   elements.push({ type: "para", text: line }); i++;
  }
  return elements.map(function(el, idx) {
   if (el.type === "title") { return React.createElement("div", { key: idx, style: { fontSize: 20, fontWeight: 800, color: BLU, letterSpacing: 1, marginBottom: 2 } }, el.text); }
   if (el.type === "subtitle") { return React.createElement("div", { key: idx, style: { fontSize: 13, color: "#777", marginBottom: 16, fontWeight: 500 } }, el.text); }
   if (el.type === "section") {
    var parts = el.text.match(/^(\d+\.)\s+(.*)/);
    return React.createElement("div", { key: idx, style: { fontSize: 15, fontWeight: 800, color: BLU, marginTop: 20, marginBottom: 6, paddingBottom: 4, borderBottom: "2px solid " + BLU } },
     parts ? [React.createElement("span", { key: "n", style: { color: ACC, marginRight: 6 } }, parts[1]), parts[2]] : el.text
    );
   }
   if (el.type === "stage") { return React.createElement("div", { key: idx, style: { fontSize: 14, fontWeight: 800, color: "#1a1a1a", marginTop: 16, marginBottom: 4, padding: "6px 10px", background: LT, borderRadius: 6, borderLeft: "3px solid " + ACC } }, el.text); }
   if (el.type === "floorhead") { return React.createElement("div", { key: idx, style: { fontSize: 11, fontWeight: 700, color: "#555", marginTop: 8, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 } }, el.text); }
   if (el.type === "subsection") { return React.createElement("div", { key: idx, style: { fontSize: 12, fontWeight: 700, color: "#333", marginTop: 10, marginBottom: 3 } }, el.text); }
   if (el.type === "done") { return React.createElement("div", { key: idx, style: { fontSize: 12, fontWeight: 700, color: "#2E7D32", marginTop: 8, marginBottom: 2 } }, el.text); }
   if (el.type === "bullet") { return React.createElement("div", { key: idx, style: { fontSize: 12, color: "#444", paddingLeft: 20, lineHeight: 1.6, position: "relative" } }, React.createElement("span", { style: { position: "absolute", left: 6, color: ACC } }, "•"), el.text); }
   if (el.type === "detail") { return React.createElement("div", { key: idx, style: { fontSize: 12, color: "#444", paddingLeft: 20, lineHeight: 1.6, position: "relative" } }, React.createElement("span", { style: { position: "absolute", left: 6, color: "#AAA" } }, "–"), el.text); }
   if (el.type === "purpose") { return React.createElement("div", { key: idx, style: { fontSize: 12, color: "#555", fontStyle: "italic", marginBottom: 6, paddingLeft: 4 } }, el.text); }
   if (el.type === "kv") {
    var cp = el.text.indexOf(": ");
    if (cp > 0) { return React.createElement("div", { key: idx, style: { fontSize: 12, lineHeight: 1.6, color: "#333", paddingLeft: 4 } }, React.createElement("span", { style: { fontWeight: 700, color: "#555" } }, el.text.substring(0, cp + 1)), " " + el.text.substring(cp + 2)); }
    return React.createElement("div", { key: idx, style: { fontSize: 12, lineHeight: 1.6, color: "#333" } }, el.text);
   }
   if (el.type === "footer") { return React.createElement("div", { key: idx, style: { fontSize: 11, color: "#999", textAlign: "center", marginTop: 4 } }, el.text); }
   if (el.type === "grandtotal") { return React.createElement("div", { key: idx, style: { fontSize: 16, fontWeight: 800, color: BLU, marginTop: 12, marginBottom: 4, padding: "8px 12px", background: LT, borderRadius: 8, borderLeft: "4px solid " + ACC } }, el.text); }
   if (el.type === "validity") { return React.createElement("div", { key: idx, style: { fontSize: 11, fontWeight: 600, color: "#E67E22", marginBottom: 8, paddingLeft: 12, fontStyle: "italic" } }, el.text); }
   if (el.type === "sigline") { return React.createElement("div", { key: idx, style: { fontSize: 12, color: "#555", marginTop: 6, paddingLeft: 4, fontFamily: "monospace" } }, el.text); }
   if (el.type === "space") { return React.createElement("div", { key: idx, style: { height: 6 } }); }
   return React.createElement("div", { key: idx, style: { fontSize: 12, lineHeight: 1.7, color: "#333" } }, el.text);
  });
 }
 function scopeToHTML(scopeText) {
  var lines = scopeText.split("\n");
  return lines.map(function(line) {
   var esc = escHtml(line);
   if (line.indexOf("BLU STANDARD") === 0) { return '<h1 style="font-size:22px;font-weight:800;color:#1B3A5C;letter-spacing:1px;margin:0 0 2px">' + esc + '</h1>'; }
   if (line.indexOf("Post-Construction") === 0) { return '<div style="font-size:13px;color:#777;margin-bottom:16px">' + esc + '</div>'; }
   if (/^[=]{10,}/.test(line)) { return '<hr style="border:none;border-top:2px solid #1B3A5C;margin:16px 0">'; }
   if (/^[-]{10,}/.test(line)) { return ''; }
   if (/^#{1,3}\s+/.test(line)) { return '<h2 style="font-size:14px;font-weight:800;color:#1B3A5C;margin:18px 0 6px;padding-bottom:3px;border-bottom:2px solid #1B3A5C">' + escHtml(line.replace(/^#{1,3}\s+/, '')) + '</h2>'; }
   if (line.indexOf("TOTAL PROJECT PRICE") >= 0) { return '<div style="font-size:16px;font-weight:800;color:#1B3A5C;margin:14px 0 4px;padding:8px 12px;background:#E8F0F8;border-left:4px solid #2E75B6;border-radius:6px">' + esc + '</div>'; }
   if (line.indexOf("This proposal is valid") >= 0) { return '<div style="font-size:10px;font-weight:600;color:#E67E22;font-style:italic;padding-left:12px;margin-bottom:8px">' + esc + '</div>'; }
   if (line.indexOf("PRICING BREAKDOWN") >= 0) { return '<h2 style="font-size:14px;font-weight:800;color:#1B3A5C;margin:18px 0 6px;padding-bottom:3px;border-bottom:2px solid #1B3A5C">' + esc + '</h2>'; }
   if (/^\d+\.\s+[A-Z]/.test(line)) { return '<h2 style="font-size:14px;font-weight:800;color:#1B3A5C;margin:18px 0 6px;padding-bottom:3px;border-bottom:2px solid #1B3A5C">' + esc + '</h2>'; }
   if (line.indexOf("STAGE —") === 0 || line.indexOf("STAGE -") === 0 || /^Stage\s+\d/i.test(line)) { return '<div style="font-size:13px;font-weight:800;margin:14px 0 4px;padding:5px 10px;background:#E8F0F8;border-left:3px solid #2E75B6;border-radius:4px">' + esc + '</div>'; }
   if (/^[A-Z0-9]/.test(line) && line.indexOf("—") > 0 && line === line.toUpperCase()) { return '<div style="font-size:11px;font-weight:700;color:#555;margin-top:8px;text-transform:uppercase;letter-spacing:0.5px">' + esc + '</div>'; }
   if (line.indexOf('"Done" Means:') >= 0 || line.indexOf("\"Done\" Means:") >= 0) { return '<div style="font-size:12px;font-weight:700;color:#2E7D32;margin-top:8px">' + esc + '</div>'; }
   if (/^\*\*[^*]+\*\*\s*$/.test(line.trim())) { return '<div style="font-size:12px;font-weight:700;color:#333;margin-top:8px">' + escHtml(line.replace(/\*\*/g, '')) + '</div>'; }
   if (/^\s+•/.test(line)) { return '<div style="font-size:11px;color:#333;padding-left:20px;line-height:1.6">&bull; ' + escHtml(line.replace(/^\s+•\s*/, '')) + '</div>'; }
   if (/^\s*[-*]\s+/.test(line) && !/^[-]{3,}/.test(line)) { return '<div style="font-size:11px;color:#333;padding-left:20px;line-height:1.6">&bull; ' + escHtml(line.replace(/^\s*[-*]\s+/, '')) + '</div>'; }
   if (/^\s{2,}/.test(line) && line.trim().length > 0) { return '<div style="font-size:11px;color:#333;padding-left:20px;line-height:1.6">&ndash; ' + escHtml(line.trim()) + '</div>'; }
   if (line.indexOf("Purpose:") === 0) { return '<div style="font-size:11px;color:#555;font-style:italic;margin-bottom:4px;padding-left:4px">' + esc + '</div>'; }
   if (/^[A-Z][A-Za-z &\/,\-()]+$/.test(line.trim()) && line.trim().length < 60 && line.trim().length > 3 && line.charAt(0) !== " " && line.indexOf(":") < 0) { return '<div style="font-size:12px;font-weight:700;color:#333;margin-top:10px;margin-bottom:3px">' + esc + '</div>'; }
   if (/^[A-Z][A-Za-z ]+\(/.test(line.trim()) && line.trim().length < 80 && line.charAt(0) !== " " && line.indexOf(":") < 0) { return '<div style="font-size:12px;font-weight:700;color:#333;margin-top:10px;margin-bottom:3px">' + esc + '</div>'; }
   if (line.indexOf("___") >= 0) { return '<div style="font-size:12px;color:#555;margin-top:8px;padding-left:4px;font-family:monospace">' + esc + '</div>'; }
   if (line.indexOf("Generated:") >= 0 && line.indexOf("FLC Estimator") >= 0) { return '<div style="font-size:9px;color:#BBB;text-align:center;margin-top:16px;padding-top:10px;border-top:1px solid #DDD">' + esc + '</div>'; }
   if (line.indexOf("BLU Crew") === 0 || line.indexOf("Fresh Local Cleaning") === 0 || line.indexOf("Dallas, TX") === 0 || line.indexOf("Caddo Mills") === 0) { return '<div style="font-size:10px;color:#999;text-align:center;margin-top:4px">' + esc + '</div>'; }
   if (line.trim() === "") { return '<div style="height:4px"></div>'; }
   var kvMatch = line.match(/^([A-Z][A-Za-z\s\/&]+):\s(.*)/);
   if (kvMatch && line.indexOf("  ") !== 0) { return '<div style="font-size:11px;line-height:1.6;color:#333"><strong style="color:#555">' + escHtml(kvMatch[1]) + ':</strong> ' + escHtml(kvMatch[2]) + '</div>'; }
   return '<div style="font-size:11px;line-height:1.7;color:#333">' + esc + '</div>';
  }).join("\n");
 }
 function buildHeaderHTML(prData, titleOverride) {
  var btName = P[proj.bt] ? P[proj.bt].name : proj.bt;
  return '<div class="header"><h1>' + escHtml(titleOverride || proj.name) + '</h1>' +
   '<div class="sub">' + escHtml(proj.client) + ' &mdash; ' + escHtml(btName) + ' &mdash; ' + fmtN(activeSF) + ' SF' + (proj.city ? ' &mdash; ' + escHtml(proj.city) : '') + '</div>' +
   '<div class="pills">' +
   sel.map(function(id) { var s = ALL_STAGES.find(function(x) { return x.id === id; }); return '<div class="pill"><div class="label">' + escHtml(s.short) + '</div><div class="val">' + fmt(prData.br[id]) + '</div></div>'; }).join('') +
   '<div class="pill"><div class="label">Mob</div><div class="val">' + fmt(prData.mob.total) + '</div></div>' +
   (prData.st > 0 ? '<div class="pill"><div class="label">Surcharges</div><div class="val">+' + fmt(prData.st) + '</div></div>' : '') +
   (prData.extTotal > 0 ? '<div class="pill"><div class="label">Exterior</div><div class="val">' + fmt(prData.extTotal) + '</div></div>' : '') +
   (prData.winPanes > 0 && prData.winSeparate ? '<div class="pill"><div class="label">Windows</div><div class="val">' + fmt(prData.winTotal) + '</div></div>' : '') +
   (prData.perDiemApplies ? '<div class="pill"><div class="label">Per Diem</div><div class="val">' + fmt(prData.perDiemTotal) + '</div></div>' : '') +
   '</div><div style="text-align:right;margin-top:10px;font-size:22px;font-weight:800">' + fmt(prData.gt) + '</div></div>';
 }
 function pageCSS() {
  return '@page{margin:0.6in 0.75in}body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;max-width:750px;margin:0 auto;padding:20px}' +
   '.header{background:linear-gradient(135deg,#1B3A5C,#0D1F38);border-radius:10px;padding:20px 24px;color:white;margin-bottom:20px}' +
   '.header h1{margin:0;font-size:18px;font-weight:800}.header .sub{font-size:11px;opacity:0.7;margin-top:3px}' +
   '.pills{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}.pill{background:rgba(255,255,255,0.12);border-radius:6px;padding:6px 10px;text-align:center;min-width:80px}' +
   '.pill .label{font-size:8px;opacity:0.6;text-transform:uppercase}.pill .val{font-size:14px;font-weight:700;margin-top:1px}' +
   '.co-box{border:2px solid #E65100;border-radius:10px;padding:20px;margin:24px 0;page-break-before:always}' +
   '.co-header{font-size:18px;font-weight:800;color:#E65100;margin:0 0 4px}.co-sub{font-size:11px;color:#777;margin-bottom:16px}' +
   '.co-grid{display:flex;gap:12px;margin:16px 0;flex-wrap:wrap}.co-card{flex:1;min-width:140px;padding:12px;border-radius:8px;text-align:center}' +
   '.co-card .co-label{font-size:9px;color:#999;text-transform:uppercase;margin-bottom:4px}' +
   '.co-card .co-val{font-size:20px;font-weight:800}.co-card .co-detail{font-size:9px;color:#999;margin-top:2px}' +
   '.co-changes{margin:12px 0;font-size:12px;line-height:1.8;color:#333}' +
   '.co-sig{margin-top:24px;font-family:monospace;font-size:12px;color:#555;line-height:2}' +
   '.co-divider{border:none;border-top:2px solid #E65100;margin:20px 0}' +
   '@media print{body{padding:0}.header,.co-box{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
 }
 function buildCOHTML(prData) {
  if (!coOriginal) { return ''; }
  var delta = prData.gt - coOriginal.gt;
  var sign = delta >= 0 ? "+" : "";
  var deltaColor = delta > 0 ? "#2E7D32" : delta < 0 ? "#C62828" : "#777";
  var d = new Date();
  var dateStr = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
  var h = '<div class="co-box">';
  h += '<div class="co-header">CHANGE ORDER</div>';
  h += '<div class="co-sub">BLU Crew &mdash; Powered by Fresh Local Cleaning</div>';
  h += '<div style="font-size:12px;line-height:1.8;margin-bottom:12px">';
  h += '<strong>Project:</strong> ' + escHtml(proj.name) + '<br>';
  h += '<strong>Client:</strong> ' + escHtml(proj.client) + '<br>';
  h += '<strong>Date:</strong> ' + escHtml(dateStr) + '<br>';
  h += '<strong>Reason:</strong> ' + escHtml(coReason || "N/A");
  h += '</div>';
  h += '<div class="co-grid">';
  h += '<div class="co-card" style="background:#F8F9FA"><div class="co-label">Original</div><div class="co-val" style="color:#999">' + fmt(coOriginal.gt) + '</div>';
  h += '<div class="co-detail">' + fmtN(coOriginal.sf) + ' SF &middot; ' + escHtml(coOriginal.tierName) + ' &middot; ' + coOriginal.stageCount + ' stages</div></div>';
  h += '<div class="co-card" style="background:#F8F9FA"><div class="co-label">Revised</div><div class="co-val" style="color:#1B3A5C">' + fmt(prData.gt) + '</div>';
  h += '<div class="co-detail">' + fmtN(activeSF) + ' SF &middot; ' + escHtml(TIERS[tier]) + ' &middot; ' + sel.length + ' stages</div></div>';
  h += '<div class="co-card" style="background:' + (delta > 0 ? '#E8F5E9' : delta < 0 ? '#FFEBEE' : '#F8F9FA') + ';border:2px solid ' + deltaColor + '">';
  h += '<div class="co-label" style="color:' + deltaColor + '">Net Change</div>';
  h += '<div class="co-val" style="color:' + deltaColor + '">' + sign + fmt(Math.abs(delta)) + '</div>';
  h += '<div class="co-detail" style="color:' + deltaColor + '">' + (delta > 0 ? 'Addition' : delta < 0 ? 'Deduction' : 'No Change') + '</div></div>';
  h += '</div>';
  // Line-item changes
  h += '<div class="co-changes"><strong style="color:#E65100">Changes:</strong><br>';
  if (activeSF !== coOriginal.sf) { h += 'SF: ' + fmtN(coOriginal.sf) + ' &rarr; ' + fmtN(activeSF) + ' (' + (activeSF > coOriginal.sf ? '+' : '') + fmtN(activeSF - coOriginal.sf) + ')<br>'; }
  if (tier !== coOriginal.tier) { h += 'Tier: ' + escHtml(coOriginal.tierName) + ' &rarr; ' + escHtml(TIERS[tier]) + '<br>'; }
  if (sel.length !== coOriginal.stageCount) { h += 'Stages: ' + coOriginal.stageCount + ' &rarr; ' + sel.length + '<br>'; }
  if (Math.abs(prData.mob.total - coOriginal.mob) > 1) { h += 'Mobilization: ' + fmt(coOriginal.mob) + ' &rarr; ' + fmt(prData.mob.total) + '<br>'; }
  if (Math.abs(prData.extTotal - coOriginal.ext) > 1) { h += 'Exterior: ' + fmt(coOriginal.ext) + ' &rarr; ' + fmt(prData.extTotal) + '<br>'; }
  var origNames = coOriginal.areas.map(function(a) { return a.name + "|" + a.floor; });
  var newNames = areas.map(function(a) { return a.name + "|" + a.floor; });
  var added = newNames.filter(function(n) { return origNames.indexOf(n) < 0; });
  var removed = origNames.filter(function(n) { return newNames.indexOf(n) < 0; });
  if (added.length > 0) { h += '<span style="color:#2E7D32">+ Added: ' + escHtml(added.map(function(a) { return a.split("|")[0]; }).join(", ")) + '</span><br>'; }
  if (removed.length > 0) { h += '<span style="color:#C62828">&minus; Removed: ' + escHtml(removed.map(function(a) { return a.split("|")[0]; }).join(", ")) + '</span><br>'; }
  h += '</div>';
  h += '<hr class="co-divider">';
  h += '<div style="text-align:center;font-size:16px;font-weight:800;color:#E65100;margin:16px 0">REVISED TOTAL: ' + fmt(prData.gt) + '</div>';
  h += '<div class="co-sig">';
  h += 'Authorized By: ___________________________&nbsp;&nbsp;Date: _________<br>';
  h += 'Printed Name:&nbsp;&nbsp;___________________________&nbsp;&nbsp;Title: ________';
  h += '</div></div>';
  return h;
 }
 function buildScopeHTML(includeCO) {
  var pr2 = getPricing();
  if (!pr2 || !scope) { return null; }
  var inner = '';
  if (includeCO && coOriginal) {
   inner += buildCOHTML(pr2);
   inner += '<div style="page-break-before:always;margin-top:24px">';
   inner += '<h2 style="font-size:16px;font-weight:800;color:#1B3A5C;margin:0 0 16px;padding-bottom:6px;border-bottom:2px solid #1B3A5C">ORIGINAL SCOPE OF WORK (Reference)</h2>';
   inner += '<div style="padding:0 4px">' + scopeToHTML(coOriginal.scope || scope) + '</div>';
   inner += '</div>';
   inner += '<div style="page-break-before:always;margin-top:24px">';
   inner += buildHeaderHTML(pr2, proj.name + ' — REVISED');
   inner += '<h2 style="font-size:16px;font-weight:800;color:#E65100;margin:16px 0 12px;padding-bottom:6px;border-bottom:2px solid #E65100">REVISED SCOPE OF WORK</h2>';
   inner += '<div style="padding:0 4px">' + scopeToHTML(scope) + '</div>';
   inner += '</div>';
  } else {
   inner += buildHeaderHTML(pr2);
   inner += '<div style="padding:0 4px">' + scopeToHTML(scope) + '</div>';
  }
  inner += '<div style="margin-top:20px;padding-top:12px;border-top:1px solid #DDD;text-align:center;font-size:9px;color:#BBB">Generated: ' + new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) + ' | FLC Estimator &mdash; BLU Crew</div>';
  return inner;
 }
 function loadHtml2Pdf() {
  return new Promise(function(resolve, reject) {
   if (window.html2pdf) { resolve(window.html2pdf); return; }
   var script = document.createElement("script");
   script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js";
   script.crossOrigin = "anonymous";
   script.onload = function() { resolve(window.html2pdf); };
   script.onerror = function() { reject(new Error("Failed to load PDF library")); };
   document.head.appendChild(script);
  });
 }
 function getPDFFileName(includeCO) {
  var base = (proj.name || "Scope").replace(/[^a-zA-Z0-9\s\-]/g, "").replace(/\s+/g, "_");
  return base + (includeCO ? "_Change_Order.pdf" : "_Scope.pdf");
 }
 function renderToContainer(includeCO) {
  var inner = buildScopeHTML(includeCO);
  if (!inner) { return null; }
  var container = document.createElement("div");
  container.style.cssText = "position:absolute;left:-9999px;top:0;width:750px;font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:20px;background:white";
  container.innerHTML = inner;
  document.body.appendChild(container);
  return container;
 }
 function downloadScope(includeCO) {
  var container = renderToContainer(includeCO);
  if (!container) { return; }
  var fileName = getPDFFileName(includeCO);
  sCopyToast("Generating PDF...");
  loadHtml2Pdf().then(function(h2p) {
   return h2p().set({
    margin: [0.5, 0.6, 0.5, 0.6],
    filename: fileName,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] }
   }).from(container).outputPdf("blob");
  }).then(function(pdfBlob) {
   document.body.removeChild(container);
   var url = URL.createObjectURL(pdfBlob);
   var a = document.createElement("a");
   a.href = url; a.download = fileName; a.style.display = "none";
   document.body.appendChild(a); a.click();
   setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
   sCopyToast("PDF downloaded ✓");
   setTimeout(function() { sCopyToast(""); }, 2500);
  }).catch(function(err) {
   try { document.body.removeChild(container); } catch(e) {}
   // Fallback: download as HTML
   var inner = buildScopeHTML(includeCO);
   var fullHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Scope</title><style>' + pageCSS() + '</style></head><body>' + inner + '</body></html>';
   var blob = new Blob([fullHtml], { type: "text/html" });
   var url = URL.createObjectURL(blob);
   var a = document.createElement("a");
   a.href = url; a.download = fileName.replace(".pdf", ".html"); a.style.display = "none";
   document.body.appendChild(a); a.click();
   setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
   sCopyToast("Downloaded as HTML — open and print to PDF");
   setTimeout(function() { sCopyToast(""); }, 3000);
  });
 }
 function emailScopeOrCO(isCO) {
  var pr2 = getPricing();
  if (!pr2 || !scope) { return; }
  var container = renderToContainer(isCO);
  if (!container) { return; }
  var fileName = getPDFFileName(isCO);
  sCopyToast("Building email with PDF...");
  var subject, bodyText;
  if (isCO && coOriginal) {
   var delta = pr2.gt - coOriginal.gt;
   var sign = delta >= 0 ? "+" : "";
   subject = "Change Order: " + proj.name + " — " + (proj.client || "Client") + " — " + sign + fmt(Math.abs(delta));
   bodyText = "Please find the Change Order for " + proj.name + " attached.\r\n\r\n";
   bodyText += "Original: " + fmt(coOriginal.gt) + "\r\n";
   bodyText += "Revised: " + fmt(pr2.gt) + "\r\n";
   bodyText += "Net Change: " + sign + fmt(Math.abs(delta)) + "\r\n\r\n";
  } else {
   subject = "Proposal: " + proj.name + " — " + (proj.client || "Client") + " — " + fmt(pr2.gt);
   bodyText = "Please find the Scope of Work for " + proj.name + " attached.\r\n\r\n";
   bodyText += "TOTAL: " + fmt(pr2.gt) + "\r\n";
   bodyText += "Proposal valid for 90 days from date of submission.\r\n\r\n";
  }
  bodyText += "Thank you,\r\nBLU Crew — Powered by Fresh Local Cleaning\r\n";
  loadHtml2Pdf().then(function(h2p) {
   return h2p().set({
    margin: [0.5, 0.6, 0.5, 0.6],
    filename: fileName,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] }
   }).from(container).outputPdf("datauristring");
  }).then(function(pdfDataUri) {
   document.body.removeChild(container);
   // Extract base64 from data URI
   var b64 = pdfDataUri.split(",")[1];
   // Build .eml with PDF attached — Outlook opens this as a draft
   var boundary = "----=_BLUCrew_" + Date.now();
   var eml = "To: \r\n";
   eml += "Subject: " + subject + "\r\n";
   eml += "X-Unsent: 1\r\n";
   eml += "MIME-Version: 1.0\r\n";
   eml += 'Content-Type: multipart/mixed; boundary="' + boundary + '"\r\n\r\n';
   eml += "--" + boundary + "\r\n";
   eml += "Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 7bit\r\n\r\n";
   eml += bodyText + "\r\n";
   eml += "--" + boundary + "\r\n";
   eml += 'Content-Type: application/pdf; name="' + fileName + '"\r\n';
   eml += "Content-Transfer-Encoding: base64\r\n";
   eml += 'Content-Disposition: attachment; filename="' + fileName + '"\r\n\r\n';
   for (var i = 0; i < b64.length; i += 76) { eml += b64.substring(i, i + 76) + "\r\n"; }
   eml += "\r\n--" + boundary + "--\r\n";
   var emlBlob = new Blob([eml], { type: "message/rfc822" });
   var url = URL.createObjectURL(emlBlob);
   var a = document.createElement("a");
   a.href = url;
   a.download = (proj.name || "Scope").replace(/[^a-zA-Z0-9\s\-]/g, "").replace(/\s+/g, "_") + (isCO ? "_CO_Email" : "_Scope_Email") + ".eml";
   a.style.display = "none";
   document.body.appendChild(a); a.click();
   setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
   sCopyToast("Email draft downloaded — double-click to open in Outlook ✓");
   setTimeout(function() { sCopyToast(""); }, 4000);
  }).catch(function(err) {
   try { document.body.removeChild(container); } catch(e) {}
   // Fallback: just download PDF + open mailto
   downloadScope(isCO);
   setTimeout(function() {
    window.location.href = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(bodyText);
   }, 600);
   sCopyToast("PDF downloaded — attach it to the email");
   setTimeout(function() { sCopyToast(""); }, 3500);
  });
 }
 function buildScope() {
  var pr = getPricing();
  if (!pr) { return "Complete pricing first."; }
  var btName = P[proj.bt] ? P[proj.bt].name : proj.bt;
  var gcNames = sel.map(function(id) { return STAGE_GC_NAMES[id] || ALL_STAGES.find(function(s) { return s.id === id; }).name; });
  var extSF = pr.extSF;
  var intAreas = areas.filter(function(a) { return a.zone !== "exterior"; });
  var extAreas = areas.filter(function(a) { return a.zone === "exterior"; });
  var L = [];
  L.push("BLU STANDARD — SCOPE OF WORK");
  L.push("Post-Construction Cleaning Services");
  L.push("==================================================\n");

  // 1. PROJECT SUMMARY
  L.push("1. PROJECT SUMMARY");
  L.push("--------------------------------------------------");
  L.push("BLU Crew will execute a structured, multi-stage post-construction cleaning program for " + proj.name + ".\n");
  L.push("Project: " + proj.name);
  L.push("Client: " + proj.client);
  L.push("Build Type: " + btName);
  if (proj.city) { L.push("Location: " + proj.city); }
  L.push("Total Interior SF: " + fmtN(pr.sf));
  if (extSF > 0) { L.push("Exterior SF: " + fmtN(extSF)); }
  L.push("Service Level: " + sel.length + "-Stage Post-Construction Cleaning Program");
  L.push("Stages: " + gcNames.join(", "));
  L.push("Estimated Duration: " + pr.projDays + " calendar days");
  L.push("Crew Deployment: " + pr.crews + " crew" + (pr.crews > 1 ? "s" : "") + " (" + pr.headcount + " personnel — 1 lead + 3 technicians per crew)");
  L.push("Mobilizations: " + sel.length + " stage-based mobilizations — one per cleaning phase");

  // Parse internal notes for schedule dates
  var scheduleNote = "";
  if (proj.notes) {
   var datePatterns = proj.notes.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/g);
   var monthPatterns = proj.notes.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/gi);
   if (datePatterns && datePatterns.length >= 2) {
    scheduleNote = "Target Schedule: " + datePatterns[0] + " through " + datePatterns[datePatterns.length - 1];
   } else if (datePatterns && datePatterns.length === 1) {
    scheduleNote = "Target Start: " + datePatterns[0];
   } else if (monthPatterns && monthPatterns.length >= 1) {
    scheduleNote = "Target Schedule: " + monthPatterns.join(" — ");
   }
  }
  if (scheduleNote) { L.push(scheduleNote); }
  L.push("");
  L.push("This program is milestone-based, zone-based, and verification-driven. Cleaning sequencing supports:");
  L.push("  • Dust migration control");
  L.push("  • Equipment installation readiness");
  L.push("  • Punch walk clarity");
  L.push("  • Operational turnover\n");
  L.push("All work is performed within released zones and scheduled access windows, per GC/Owner direction.");
  L.push("Verification for each stage is captured via BLU Report (before/after photos by zone and documented issues).\n");

  // PRICING BREAKDOWN
  L.push("PRICING BREAKDOWN");
  L.push("");
  L.push("Interior Cleaning (" + fmtN(pr.sf) + " SF × " + fmtR(pr.rate) + "/SF)");
  sel.forEach(function(id) { var st = ALL_STAGES.find(function(x) { return x.id === id; }); L.push("  " + (STAGE_GC_NAMES[id] || st.name) + ": " + fmt(pr.br[id])); });
  L.push("  Interior Subtotal: " + fmt(pr.bt));

  // Surcharges
  var surchTotal = 0;
  var activeSurchs = [];
  SURCH_LIST.forEach(function(s) {
   var pct = surch[s.id];
   if (pct && pct > 0) {
    var surchBase = pr.bt + pr.extBase + (pr.winSeparate ? pr.winTotal : 0);
    var amt = surchBase * (pct / 100);
    surchTotal += amt;
    activeSurchs.push({ name: s.name, pct: pct, amt: amt });
   }
  });
  if (activeSurchs.length > 0) {
   L.push("");
   L.push("Surcharges");
   activeSurchs.forEach(function(s) {
    L.push("  " + s.name + " (" + s.pct + "%): " + fmt(s.amt));
   });
   L.push("  Surcharge Subtotal: " + fmt(surchTotal));
  }

  // Mobilization
  L.push("");
  L.push("Mobilization (" + sel.length + " trips)");
  L.push("  Base staging & equipment fee: " + fmt(pr.mob.base));
  if (pr.mob.miles > 0) {
   L.push("  Travel: " + fmtN(pr.mob.miles) + " mi one-way × 2 (round-trip) × " + sel.length + " trips × $" + CONFIG.MILEAGE_RATE.toFixed(2) + "/mi = " + fmt(pr.mob.tmil));
  }
  L.push("  Mobilization Subtotal: " + fmt(pr.mob.total));
  L.push("  Mobilization covers equipment transport, supply staging, crew deployment, and site setup for each cleaning phase.");
  L.push("  Each mobilization aligns with a stage start — crew arrives with stage-specific equipment and materials:");
  sel.forEach(function(id) {
   var gcN = STAGE_GC_NAMES[id] || ALL_STAGES.find(function(s) { return s.id === id; }).name;
   if (id === "preEquip") { L.push("    Mob " + 1 + " — " + gcN + ": Industrial vacuums, debris removal tools, floor scrubbers, chemical pre-treatment supplies"); }
   if (id === "prePunch") { L.push("    Mob " + (sel.indexOf(id) + 1) + " — " + gcN + ": Detail carts, steamers, scrapers, microfiber systems, orbital/cylindrical scrubbers, glass tools"); }
   if (id === "final") { L.push("    Mob " + (sel.indexOf(id) + 1) + " — " + gcN + ": Touch-up kits, sanitization supplies, final-pass microfiber, polish compounds"); }
   if (id === "go") { L.push("    Mob " + (sel.indexOf(id) + 1) + " — " + gcN + ": Presentation-grade detailing kits, polish, lint-free materials, white-glove supplies"); }
  });

  // Exterior
  if (pr.extTotal > 0) {
   L.push("");
   L.push("Exterior Surface Cleaning (" + fmtN(pr.extSF) + " SF × " + fmtR(pr.extRate) + "/SF)");
   L.push("  Power wash / surface cleaning: " + fmt(pr.extBase));
   if (pr.extTire > 0) { L.push("  Tire track removal addon: " + fmt(pr.extTire)); }
   L.push("  Exterior Subtotal: " + fmt(pr.extTotal));
  }

  // Windows
  if (pr.winPanes > 0 && pr.winSeparate) {
   L.push("");
   L.push("Exterior Window Cleaning (" + fmtN(pr.winPanes) + " panes × " + fmtR(pr.winRate) + "/pane)");
   L.push("  Window Subtotal: " + fmt(pr.winTotal));
  }
  if (pr.winPanes > 0 && !pr.winSeparate) {
   L.push("");
   L.push("Exterior Window Cleaning: Included as added value");
   L.push("  " + fmtN(pr.winPanes) + " panes bundled into interior price (+" + fmtR(pr.winBundledPerSF) + "/SF absorbed)");
  }

  // Per Diem
  if (pr.perDiemApplies) {
   L.push("");
   L.push("Crew Travel & Lodging (Per Diem)");
   L.push("  " + pr.crews + " crew" + (pr.crews > 1 ? "s" : "") + " × " + pr.headcount + " people × $" + pr.perDiemRate + "/day × " + pr.projDays + " days = " + fmt(pr.perDiemTotal));
  }

  L.push("");
  L.push("TOTAL PROJECT PRICE: " + fmt(pr.gt));
  L.push("This proposal is valid for ninety (90) days from the date of generation.");
  L.push("");

  // 2. ZONES COVERED
  L.push("2. ZONES COVERED (PER PLANS)");
  L.push("--------------------------------------------------");
  if (intAreas.length > 0) {
   var intFloors = {};
   var intOrder = [];
   intAreas.forEach(function(a) { if (!intFloors[a.floor]) { intFloors[a.floor] = []; intOrder.push(a.floor); } intFloors[a.floor].push(a); });
   intOrder.forEach(function(f) {
    L.push(f.toUpperCase() + " — INTERIOR");
    intFloors[f].forEach(function(a) { L.push("  " + a.area + " (" + fmtN(a.sf) + " SF) — " + a.floorType); });
   });
  }
  if (extAreas.length > 0) {
   L.push("EXTERIOR / SITE");
   extAreas.forEach(function(a) { L.push("  " + a.area + " (" + fmtN(a.sf) + " SF)"); });
  }
  L.push("");

  // 3. CLEANING STAGES & ALIGNMENT
  L.push("3. CLEANING STAGES & ALIGNMENT");
  L.push("--------------------------------------------------");
  L.push("To ensure clarity between project stakeholders, the following stage alignment applies:");
  L.push("Each stage serves a distinct purpose in preparing the facility for equipment installation, inspection, and turnover.\n");
  sel.forEach(function(id) {
   var gcN = STAGE_GC_NAMES[id] || ALL_STAGES.find(function(s) { return s.id === id; }).name;
   var purpose = "";
   if (id === "preEquip") { purpose = "Prepare floors and spaces for equipment/furniture installation. Minimize dust and debris migration. Remove stuck-on material early."; }
   if (id === "prePunch") { purpose = "Deepest clean of the project. Make punch items obvious — no dust hiding defects. Set up final cleaning to be fast, not a full re-clean."; }
   if (id === "final") { purpose = "Confirm punch items are complete. Deliver a space that meets client expectations. Prepare for handover to ownership/operations."; }
   if (id === "go") { purpose = "Create perfect first-impression shine. Ensure the GC and owner look world-class on opening day. Remove final dust, smears, and footprints."; }
   L.push(gcN);
   L.push("  Purpose: " + purpose + "\n");
  });

  // 4. DETAILED SCOPE BY STAGE
  L.push("4. DETAILED SCOPE OF WORK (BY STAGE)");
  L.push("--------------------------------------------------\n");
  sel.forEach(function(id) {
   var gcN = STAGE_GC_NAMES[id] || ALL_STAGES.find(function(s) { return s.id === id; }).name;

   if (id === "preEquip") {
    L.push("STAGE — " + gcN.toUpperCase());
    L.push("Purpose: Deliver an installer-ready environment suitable for equipment staging and installation.\n");
    L.push("Debris Removal & Area Preparation");
    L.push("  Remove all large construction debris and packaging");
    L.push("  Collect screws, fasteners, sharp objects, and hazardous debris");
    L.push("  Clear access paths and staging areas");
    L.push("  Move excess materials out of work zones or stage neatly\n");
    L.push("Overhead & High-Surface Cleaning");
    L.push("  Dust/vacuum all vents, lights, and ceiling surfaces");
    L.push("  Clean exposed ductwork, cable trays, and ceiling-mounted infrastructure");
    L.push("  Remove settled dust from all high ledges and exposed surfaces\n");
    L.push("Vertical & Architectural Surfaces");
    L.push("  Remove heavy dust from walls, doors, and frames");
    L.push("  Maintain clean circulation corridors\n");
    L.push("Floors");
    L.push("  Remove all loose debris");
    L.push("  Vacuum entire surface");
    L.push("  Apply cleaning solution with dwell time");
    L.push("  Mechanically scrub finished surfaces where released");
    L.push("  Detail edges and perimeters");
    L.push("  Leave residue-free and non-slip\n");
    L.push("\"Done\" Means:");
    L.push("  No loose debris that can scratch floors or damage equipment.");
    L.push("  Walk paths clear and safe.");
    L.push("  Floors clean enough for installers to work without fighting debris.\n");
   }

   if (id === "prePunch") {
    L.push("STAGE — " + gcN.toUpperCase());
    L.push("Purpose: Eliminate remaining construction contaminants, expose deficiencies, and prepare for punch walks.\n");
    L.push("Debris Removal & Final Prep");
    L.push("  Remove remaining construction debris and packaging");
    L.push("  Clear all rooms, closets, and storage areas of obstructions\n");
    L.push("Overhead, Ceiling-Mounted & Wall-Mounted Fixtures");
    L.push("  Dust/vacuum all vents, lights, ceiling surfaces, and sprinkler heads");
    L.push("  Wipe and detail all ceiling and wall-mounted equipment");
    L.push("  Remove dust, paint, adhesive, and construction residue from fixtures\n");
    L.push("Wall Cleaning");
    L.push("  Remove all dust from wall surfaces top to bottom");
    L.push("  Detail based on soil level and material");
    L.push("  Tile walls: scrape paint, grout haze, adhesive; wipe streak-free");
    L.push("  Painted walls: remove marks (no burnishing of finish)\n");
    L.push("Windows, Frames & Interior Glazing");
    L.push("  Scrub entire window surface and frame");
    L.push("  Scrape glass wet only — never dry scrape");
    L.push("  Squeegee and detail frames");
    L.push("  Detail glass to streak-free finish");
    L.push("  Clean all interior glazing, storefront, and mirrors\n");
    L.push("Doors, Frames & Hardware");
    L.push("  Wipe both sides of all doors — tops, edges, bottoms");
    L.push("  Detail hinges, frames, and hardware");
    L.push("  Clean metal handles and pulls\n");
    L.push("Inside Cabinets, Drawers, Lockers & Appliances");
    L.push("  Vacuum interior debris");
    L.push("  Wipe tops, sides, bottoms of all interior compartments");
    L.push("  Detail corners and edges");
    L.push("  Leave open for quality verification\n");
    L.push("General Post-Construction Surface Detailing");
    L.push("  Top-to-bottom wipe of all visible surfaces");
    L.push("  Detail with appropriate tools per surface type");
    L.push("  Remove paint splatter, adhesive residue, sticker residue, and construction markings\n");
    L.push("Stainless Steel Polishing (Where Applicable)");
    L.push("  Pre-clean all stainless surfaces");
    L.push("  Apply polish and buff with grain to glossy finish\n");
    L.push("Wainscoting & Baseboard Detailing");
    L.push("  Remove dust from all baseboards and wainscoting");
    L.push("  Steam and scrape paint, adhesive, and grout");
    L.push("  Wipe with pressure; detail edges and corners\n");
    L.push("Floor Care (By Type)");
    L.push("  Remove debris too large for vacuum");
    L.push("  Vacuum entire surface");
    L.push("  Edge and corner detail");
    L.push("  Apply cleaning solution with dwell time");
    L.push("  Remove glue, paint, grout haze while solution dwells");
    L.push("  Mechanical scrub (orbital → cylindrical as appropriate)");
    L.push("  Hard Floors: Full mop with edge detail");
    L.push("  Carpet: Steam clean and allow dry time");
    L.push("  Rubber Floors: Mop edges and corners thoroughly");
    L.push("  Leave floors clean, streak-free, and residue-free\n");
    L.push("\"Done\" Means:");
    L.push("  Space feels move-in ready.");
    L.push("  Punch walk exposes defects — not dirt.");
    L.push("  No construction dust, smears, or leftover debris.\n");
   }

   if (id === "final") {
    L.push("STAGE — " + gcN.toUpperCase());
    L.push("Purpose: Confirm punch items are complete and deliver a space ready for handover to ownership/operations.\n");
    L.push("Full Verification & Touch-Up");
    L.push("  Re-verify every surface and area from prior stages");
    L.push("  If any area needs touch-up or redo, it is corrected regardless of cleaning stage\n");
    L.push("Touch-Up & Detail Corrections");
    L.push("  Re-address all areas per punchlist feedback");
    L.push("  Fix areas re-dirtied by final trades");
    L.push("  Final dust and polish all surfaces\n");
    L.push("High-Traffic & High-Visibility Zones");
    L.push("  Focus on entrances, lobbies, corridors, and restrooms");
    L.push("  Final glass clean — remove all stickers, labels, and markings");
    L.push("  Final sanitize all restroom fixtures\n");
    L.push("Final Floor Presentation");
    L.push("  Final mop/scrub hard floors");
    L.push("  Final vacuum all carpet");
    L.push("  Edge detailing and spot correction\n");
    L.push("\"Done\" Means:");
    L.push("  GC/Owner can sign off.");
    L.push("  All punch cleaning items resolved.");
    L.push("  Space is truly move-in ready.\n");
   }

   if (id === "go") {
    L.push("STAGE — " + gcN.toUpperCase());
    L.push("Purpose: Create perfect first-impression shine for grand opening or operational launch.\n");
    L.push("Visual Perfection Detailing");
    L.push("  Remove fingerprints, smudges, and streaks from all surfaces");
    L.push("  Polish all hardware, fixtures, and glazing");
    L.push("  Detail all high-visibility areas\n");
    L.push("Presentation Focus Areas");
    L.push("  Entrances, lobbies, and public-facing areas to executive standard");
    L.push("  Elevator cabs and vestibules detailed");
    L.push("  Conference rooms, reception, and common areas presentation-ready\n");
    L.push("Final Floor Presentation");
    L.push("  Final vacuum");
    L.push("  Edge detailing");
    L.push("  Spot correction only — no re-scrub\n");
    L.push("\"Done\" Means:");
    L.push("  Guests notice the building — not the cleaning.");
    L.push("  GC/Owner feels confident and calm on opening day.\n");
   }

   L.push("Verification captured via BLU Report (before/after photos by zone and documented issues).\n");
  });

  // 5. RESTROOM CLEANING (standard)
  var hasRestrooms = areas.some(function(a) { var n = (a.area || "").toLowerCase(); return n.indexOf("restroom") >= 0 || n.indexOf("bathroom") >= 0 || n.indexOf("locker") >= 0 || n.indexOf("shower") >= 0; });
  if (hasRestrooms || true) {
   L.push("5. RESTROOM & WET AREA CLEANING");
   L.push("--------------------------------------------------");
   L.push("Applied to all restrooms, locker rooms, and wet areas during Pre-Punchlist and Final stages.\n");
   L.push("Showers (Where Applicable)");
   L.push("  Clean shower heads — remove build-up and construction marks");
   L.push("  Scrub/wipe handicap rails and knobs");
   L.push("  Clean glass enclosures per window protocol");
   L.push("  Scrub benches and tile behind wall fixtures");
   L.push("  Clean and remove drain coverings; remove grate and clean underneath\n");
   L.push("Sinks (Clean & Disinfect)");
   L.push("  Remove debris by hand or towel");
   L.push("  Scrape and detail to remove glue, paint, and construction residue");
   L.push("  Finish to streak-free shine\n");
   L.push("Toilets, Urinals, Stalls & Partitions (Clean & Disinfect)");
   L.push("  Apply cleanser to bowls and urinals; scrub entire interior");
   L.push("  Disinfect stall handles, walls adjacent to fixtures, seat top/bottom, and all exterior surfaces");
   L.push("  Wipe using disposable towels — dispose after each stall\n");
  }

  // 6. BUILD-TYPE SPECIFIC PROTOCOLS
  var secN = 6;
  var proto = BT_PROTOCOLS[proj.bt];
  if (proto) {
   L.push(secN + ". " + proto.label);
   L.push("--------------------------------------------------");
   proto.items.forEach(function(item) { L.push("  " + item); });
   L.push("");
   secN++;
  }

  // EXTERIOR SURFACE CLEANING
  if (extSF > 0) {
   L.push(secN + ". EXTERIOR SURFACE CLEANING");
   L.push("--------------------------------------------------");
   L.push("Mechanical sweeping, high-pressure surface cleaning, and controlled rinse to remove dirt, dust, and construction residue.\n");
   L.push("Total Exterior SF: " + fmtN(extSF));
   if (proj.extTire) { L.push("Tire Track Removal: Included\n"); }
   L.push("Coverage:");
   extAreas.forEach(function(a) { L.push("  " + a.area + " (" + fmtN(a.sf) + " SF)"); });
   if (parseInt(proj.extSF) > 0) { L.push("  Additional exterior areas: " + fmtN(parseInt(proj.extSF)) + " SF"); }
   L.push("  (See Pricing Breakdown for rates)");
   L.push("");
   secN++;
  }

  // EXTERIOR WINDOW CLEANING
  if (pr.winPanes > 0) {
   if (pr.winSeparate) {
    L.push(secN + ". EXTERIOR WINDOW CLEANING");
    L.push("--------------------------------------------------");
    L.push("  " + fmtN(pr.winPanes) + " panes (" + (proj.winHeight.charAt(0).toUpperCase() + proj.winHeight.slice(1) + " access tier") + ")");
    L.push("  Includes full exterior glass cleaning: wet scrub, scrape (wet only), squeegee, and frame detail.");
   } else {
    L.push(secN + ". EXTERIOR WINDOW CLEANING (INCLUDED)");
    L.push("--------------------------------------------------");
    L.push("  " + fmtN(pr.winPanes) + " panes included as added value — bundled into interior cleaning price.");
    L.push("  Full exterior glass cleaning: wet scrub, scrape (wet only), squeegee, and frame detail.");
   }
   L.push("");
   secN++;
  }

  // PER DIEM
  if (pr.perDiemApplies) {
   L.push(secN + ". CREW TRAVEL & LODGING (PER DIEM)");
   L.push("--------------------------------------------------");
   L.push("For projects exceeding " + CONFIG.PER_DIEM_THRESHOLD + " calendar days, per diem is applied to cover crew hotel and meal expenses." + (proj.perDiemOverride && pr.projDays <= CONFIG.PER_DIEM_THRESHOLD ? " Per diem applied per project agreement regardless of duration." : "") + "\n");
   L.push("Crews: " + pr.crews + " (" + pr.headcount + " people — 1 lead + 3 techs per crew)");
   L.push("Estimated Duration: " + pr.projDays + " calendar days");
   L.push("Per diem rate is based on local area lodging and meal costs for the project city.");
   L.push("Actual duration may vary based on zone release schedule and access.\n");
   secN++;
  }

  // EXECUTION, ACCESS & VERIFICATION
  L.push(secN + ". EXECUTION, ACCESS & VERIFICATION");
  L.push("--------------------------------------------------");
  L.push("All work is executed within released zones and scheduled access windows, per GC/Owner direction.");
  L.push("Verification for each stage is captured via BLU Report (before/after photos by zone and documented issues).");
  L.push("Final walk with GC/Owner representative for sign-off upon completion of each stage.");
  L.push("BLU Crew is HUB Certified and maintains General Liability, Workers' Compensation, and Commercial Auto insurance. COI available upon request.\n");
  secN++;

  // EXCLUSIONS
  L.push(secN + ". EXCLUSIONS (PRICED SEPARATELY IF REQUESTED)");
  L.push("--------------------------------------------------");
  L.push("  Re-cleaning caused by post-cleaning trade activity");
  L.push("  Hazardous material removal");
  L.push("  Cleaning inside energized equipment");
  L.push("  Cleaning outside released zones or approved access windows");
  if (pr.winPanes > 0) {
   // Windows are included — don't list as exclusion
  } else {
   L.push("  Exterior window cleaning (can be quoted separately upon request)");
  }
  L.push("  FF&E assembly, placement, or ongoing janitorial services");
  L.push("  Swab testing or environmental certification (can be coordinated if required)\n");
  secN++;

  // CLOSE-OUT STANDARD
  L.push(secN + ". CLOSE-OUT STANDARD");
  L.push("--------------------------------------------------");
  L.push("Cleaning is complete when:");
  L.push("  All interior spaces are inspection-ready");
  L.push("  No visible dust, residue, or construction contaminants remain");
  L.push("  Punch walks and inspections reveal no cleanliness issues");
  L.push("  Facility is suitable for operational turnover");
  if (extSF > 0) { L.push("  Exterior surfaces are clean and free of construction debris"); }
  L.push("");
  secN++;

  // TERMS & CONDITIONS
  L.push(secN + ". TERMS & CONDITIONS");
  L.push("--------------------------------------------------");
  L.push("Proposal Validity: This proposal is valid for ninety (90) days from the date of generation.");
  L.push("Payment Terms: Net 30 from invoice date. Progress billing may apply for projects exceeding 14 calendar days.");
  L.push("Change Orders: Work outside the original scope (additional areas, re-cleaning due to trade activity, schedule acceleration) will be quoted and approved in writing prior to execution.");
  L.push("Insurance: BLU Crew maintains General Liability, Workers' Compensation, and Commercial Auto coverage. Certificates of Insurance provided upon request.");
  L.push("Scheduling: Start dates are subject to confirmed zone release and site access. BLU Crew will coordinate mobilization timing directly with the GC/Owner representative.");
  L.push("Cancellation: Cancellations within 48 hours of scheduled mobilization may be subject to a remobilization fee.\n");
  secN++;

  // ACCEPTANCE
  L.push(secN + ". ACCEPTANCE");
  L.push("--------------------------------------------------");
  L.push("By signing below, the authorized representative agrees to the scope, pricing, and terms outlined in this document.\n");
  L.push("Accepted By: ___________________________________    Date: _______________");
  L.push("Printed Name: ___________________________________");
  L.push("Title: ___________________________________");
  L.push("Company: " + (proj.client || "___________________________________"));
  L.push("");
  L.push("==================================================");
  L.push("BLU Crew — Powered by Fresh Local Cleaning");
  L.push("Dallas, TX | Post-Construction Specialists");
  L.push("Generated: " + new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) + " | FLC Estimator");
  return L.join("\n");
 }
 function genScope() {
  sScopeL(true);
  sScopeErr("");
  var pr = getPricing();
  if (!pr) { sScope(buildScope()); sScopeGT(0); sScopeL(false); return; }
  var btName = P[proj.bt] ? P[proj.bt].name : proj.bt;
  var gcNames = sel.map(function(id) { return STAGE_GC_NAMES[id] || ALL_STAGES.find(function(s) { return s.id === id; }).name; });
  var sCosts = sel.map(function(id) { return (STAGE_GC_NAMES[id] || ALL_STAGES.find(function(s) { return s.id === id; }).name) + ": " + fmt(pr.br[id]); }).join("\n");
  var intList = areas.filter(function(a) { return a.zone !== "exterior"; }).map(function(a) { return a.floor + " | " + a.area + " | " + a.sf + " SF | " + a.floorType; }).join("\n");
  var extList = areas.filter(function(a) { return a.zone === "exterior"; }).map(function(a) { return a.floor + " | " + a.area + " | " + a.sf + " SF"; }).join("\n");
  var proto = BT_PROTOCOLS[proj.bt];
  var extSF = pr.extSF;
  var winInfo = "";
  if (pr.winPanes > 0 && pr.winSeparate) { winInfo = "\nExt. Windows: " + fmtN(pr.winPanes) + " panes at " + fmtR(pr.winRate) + "/pane = " + fmt(pr.winTotal) + " (priced separately, " + (proj.winHeight + " tier") + ")"; }
  if (pr.winPanes > 0 && !pr.winSeparate) { winInfo = "\nExt. Windows: " + fmtN(pr.winPanes) + " panes BUNDLED as added value (absorbed into interior $/SF)"; }
  // Surcharge info for AI prompt
  var surchInfo = "";
  SURCH_LIST.forEach(function(s) { var pct = surch[s.id]; if (pct && pct > 0) { var base = pr.bt + pr.extBase + (pr.winSeparate ? pr.winTotal : 0); surchInfo += "\n  " + s.name + ": " + pct + "% = " + fmt(base * pct / 100); } });
  if (surchInfo) { surchInfo = "\nSurcharges:" + surchInfo + "\nSurcharge Total: " + fmt(pr.st); }
  // Mob detail for AI prompt
  var mobInfo = "\nMobilization: " + fmt(pr.mob.total) + " (" + sel.length + " trips)";
  mobInfo += "\n  Base: " + fmt(pr.mob.base);
  if (pr.mob.miles > 0) { mobInfo += "\n  Travel: " + fmtN(pr.mob.miles) + " mi RT × " + sel.length + " trips × $" + CONFIG.MILEAGE_RATE.toFixed(2) + "/mi = " + fmt(pr.mob.tmil); }
  // Duration info
  var durInfo = "\nEstimated Duration: " + pr.projDays + " calendar days";
  durInfo += "\nCrew: " + pr.crews + " crew" + (pr.crews > 1 ? "s" : "") + " (" + pr.headcount + " personnel)";
  // Notes
  var notesInfo = proj.notes ? "\nInternal Notes: " + proj.notes : "";
  var prompt = "You are generating a BLU Standard Scope of Work for post-construction cleaning. Use the EXACT structure and format provided in the template below. Fill in project-specific details. Do NOT use the word 'CLEAN' as a system name — describe the cleaning actions directly.\n\nProject: " + proj.name + "\nClient: " + proj.client + "\nBuild: " + btName + (proj.city ? "\nLocation: " + proj.city : "") + "\nInterior SF: " + fmtN(activeSF) + (exteriorSF > 0 ? "\nExterior SF: " + fmtN(exteriorSF) : "") + "\nStages: " + gcNames.join(", ") + durInfo + "\nTotal: " + fmt(pr.gt) + mobInfo + winInfo + surchInfo + notesInfo + "\n\nStage Costs:\n" + sCosts + "\n\nInterior Areas:\n" + intList + "\n" + (extList ? "Exterior Areas:\n" + extList + "\n" : "") + "\nUse this EXACT document structure:\n1. PROJECT SUMMARY — include duration, crew count, mobilization count, and schedule dates if found in notes. Include PRICING BREAKDOWN section with: interior subtotal, each surcharge by name/%, mob breakdown, exterior, windows, per diem, and TOTAL PROJECT PRICE. After total add: 'This proposal is valid for ninety (90) days from the date of generation.'\n2. ZONES COVERED (PER PLANS) — list by floor, interior then exterior\n3. CLEANING STAGES & ALIGNMENT — each stage with purpose (no pricing here, already in breakdown)\n4. DETAILED SCOPE BY STAGE — for each stage list subsections (Debris Removal, Overhead, Walls, Windows, Doors, Cabinets, Surface Detailing, Floors etc.) with bullet items. Include 'Done Means' for each stage.\n5. RESTROOM & WET AREA CLEANING — showers, sinks, toilets/urinals/partitions\n" + (proto ? "6. " + proto.label + "\n" : "") + (extSF > 0 ? (proto ? "7" : "6") + ". EXTERIOR SURFACE CLEANING\n" : "") + "Then: EXECUTION ACCESS & VERIFICATION (mention HUB Certified, GL/WC/Auto insurance, COI available), EXCLUSIONS, CLOSE-OUT STANDARD, TERMS & CONDITIONS (proposal validity 90 days, Net 30, change orders, insurance, scheduling, cancellation), ACCEPTANCE (signature block with Accepted By, Date, Printed Name, Title, Company)\n\nEnd every stage with: 'Verification captured via BLU Report (before/after photos by zone and documented issues).'\nStage names use dual format: 'Pre-Equipment Cleaning (Initial Clean)' etc.\nBe specific to the build type (" + btName + "). Professional tone. No filler language.";
  fetch(getAIEndpoint(), {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8000, temperature: 0, messages: [{ role: "user", content: prompt }] })
  }).then(function(resp) {
   if (!resp.ok) { throw new Error("API " + resp.status); }
   return resp.json();
  }).then(function(data) {
   var text = "";
   if (data.content) {
    for (var i = 0; i < data.content.length; i++) {
     if (data.content[i].text) { text = text + data.content[i].text; }
    }
   }
   if (text && text.length > 100) {
    sScope(text);
    sScopeGT(pr ? pr.gt : 0);
    sScopeEdit(false);
    sScopeL(false);
    return;
   }
   throw new Error("Empty response");
  }).catch(function(err) {
   // API failed — fall back to local template
   sScope(buildScope());
   sScopeGT(pr ? pr.gt : 0);
   sScopeEdit(false);
   sScopeL(false);
  });
 }

 var EXT_KEYWORDS = ["parking", "garage", "sidewalk", "walkway", "driveway", "courtyard", "basketball", "tennis", "playground", "loading dock", "loading area", "drive aisle", "drive lane", "hardscape", "pavement", "asphalt", "concrete pad", "exterior walk", "entry drive", "porte cochere", "carport"];
 function classifyZone(area) {
  var name = (area.area || "").toLowerCase();
  var floor = (area.floor || "").toLowerCase();
  var special = (area.special || "").toLowerCase();
  if (special === "exterior") { return "exterior"; }
  for (var i = 0; i < EXT_KEYWORDS.length; i++) {
   if (name.indexOf(EXT_KEYWORDS[i]) >= 0) { return "exterior"; }
  }
  // Word-boundary checks for short keywords that could false-match (lot vs lottery, court vs courtroom, ramp vs rampart)
  var wordBoundaryKeywords = ["lot", "court", "ramp"];
  for (var w = 0; w < wordBoundaryKeywords.length; w++) {
   var kw = wordBoundaryKeywords[w];
   var idx = name.indexOf(kw);
   if (idx >= 0) {
    var after = idx + kw.length;
    if (after >= name.length || /[^a-z]/.test(name[after])) { return "exterior"; }
   }
  }
  if (name.indexOf("pool") >= 0 || name.indexOf("deck") >= 0) {
   var lvl = parseInt(floor.replace(/[^0-9]/g, "")) || 0;
   if (lvl <= 1 || floor.indexOf("ground") >= 0 || floor.indexOf("g") === 0) { return "exterior"; }
   return "interior";
  }
  if (name.indexOf("balcon") >= 0 || name.indexOf("terrace") >= 0 || name.indexOf("rooftop") >= 0 || name.indexOf("roof ") >= 0) {
   return "interior";
  }
  return "interior";
 }
 function autoClassifyAreas(areaList) {
  return areaList.map(function(a) {
   if (!a.zone) {
    var copy = {};
    for (var k in a) { copy[k] = a[k]; }
    copy.zone = classifyZone(a);
    return copy;
   }
   return a;
  });
 }

 var interiorSF = 0;
 var exteriorSF = 0;
 areas.forEach(function(a) {
  var sf = parseInt(a.sf) || 0;
  if (a.zone === "exterior") { exteriorSF += sf; }
  else { interiorSF += sf; }
 });
 var drawingSF = interiorSF + exteriorSF;
 var activeSF = interiorSF > 0 ? interiorSF : (parseInt(proj.sf) || 0);
 var autoCrews = estCrews(activeSF);

 var pr = getPricing();
 var mc = getMob();
 var canNext = proj.name && proj.client && proj.bt && (proj.sf || drawingSF > 0) && sel.length > 0;
 var pad = isMobile ? 14 : 28;
 var card = { background: "white", borderRadius: 12, padding: pad, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16 };
 var g2 = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : 16 };
 var lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5 };
 var inp = { width: "100%", padding: "10px 12px", border: "1px solid #DDD", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" };
 var bPrimary = { display: "inline-block", padding: isMobile ? "10px 16px" : "11px 24px", borderRadius: 10, border: "none", background: ACC, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" };
 var bSecondary = { display: "inline-block", padding: isMobile ? "10px 16px" : "11px 24px", borderRadius: 10, border: "1px solid #DDD", background: "white", color: "#555", fontSize: 14, fontWeight: 600, cursor: "pointer" };
 var bRow = { display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginTop: 20 };

 function editArea(i, field, val) {
  sAreas(function(prev) {
   var copy = prev.slice();
   var row = {};
   for (var k in copy[i]) { row[k] = copy[i][k]; }
   row[field] = val;
   // Auto-reclassify zone when area name changes
   if (field === "area") { row.zone = classifyZone(row); }
   copy[i] = row;
   return copy;
  });
 }

 // SF range validation — returns {min, max} for current build type
 function getSFRange(bt) {
  var b = P[bt];
  if (!b) { return null; }
  var allBands = [];
  if (b.stages) { var stageKeys = Object.keys(b.stages); allBands = []; stageKeys.forEach(function(k) { allBands = allBands.concat(b.stages[k]); }); }
  if (allBands.length === 0) { return null; }
  var min = allBands[0][0];
  var max = allBands[0][1];
  allBands.forEach(function(band) { if (band[0] < min) { min = band[0]; } if (band[1] > max) { max = band[1]; } });
  return { min: min, max: max };
 }

 // Duplicate area detection
 function getDuplicateWarnings() {
  var dupes = [];
  for (var i = 0; i < areas.length; i++) {
   for (var j = i + 1; j < areas.length; j++) {
    var a = areas[i]; var b = areas[j];
    if (a.floor === b.floor && a.area === b.area && a.sf === b.sf && a.floorType === b.floorType && a.zone === b.zone) {
     dupes.push({ floor: a.floor, area: a.area, i: i, j: j });
    }
   }
  }
  return dupes;
 }

 // Bulk floor type change
 function bulkSetFloorType(from, to) {
  sAreas(function(prev) {
   return prev.map(function(a) {
    if (a.floorType === from) { var copy = {}; for (var k in a) { copy[k] = a[k]; } copy.floorType = to; return copy; }
    return a;
   });
  });
 }

 // Bulk zone change

 return (
  <div style={{ fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", background: "#F5F6F8", minHeight: "100vh", color: "#1a1a1a" }}>
   <style dangerouslySetInnerHTML={{ __html: "@media print { body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } div[style*='sticky'] { position: relative !important; } div[style*='F5F6F8'] { background: white !important; } div[style*='boxShadow'] { box-shadow: none !important; border: 1px solid #DDD !important; } button { display: none !important; } input, select, textarea { border: none !important; padding: 0 !important; } div[style*='maxHeight'] { max-height: none !important; overflow: visible !important; } }" }} />
   <div style={{ background: "linear-gradient(135deg, " + BLU + ", #0D1F38)", padding: isMobile ? "12px 14px" : "16px 28px", position: "sticky", top: 0, zIndex: 50 }}>
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
     <div>
      <div style={{ color: "white", fontSize: isMobile ? 16 : 20, fontWeight: 700 }}>FLC ESTIMATOR</div>
      {!isMobile && <div style={{ color: "#8BAFD4", fontSize: 11 }}>BLU Crew — Powered by Fresh Local Cleaning</div>}
     </div>
     <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {SN.map(function(s, i) {
       return (
        <button key={i} onClick={function() { if (i <= step || (i >= 2 && areas.length > 0) || (i === 4 && pr)) { setStep(i); } }}
         style={{ padding: isMobile ? "5px 8px" : "5px 14px", borderRadius: 16, border: "none", cursor: "pointer", fontSize: isMobile ? 10 : 12, fontWeight: i === step ? 700 : 500, background: i === step ? "white" : (i < step ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"), color: i === step ? BLU : (i < step ? "#B0D0F0" : "#5A7A9A"), whiteSpace: "nowrap" }}>
         {isMobile ? (i + 1) : ((i + 1) + ". " + s)}
        </button>
       );
      })}
      <div style={{ position: "relative", marginLeft: 4 }}>
       <button onClick={function() { sShowDashboard(!showDashboard); }}
        style={{ padding: isMobile ? "5px 8px" : "5px 12px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.25)", background: showDashboard ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)", color: "#B0D0F0", fontSize: isMobile ? 10 : 11, cursor: "pointer", whiteSpace: "nowrap" }}>{isMobile ? "📊" : "📊 Clients"}</button>
      </div>
      <div style={{ position: "relative", marginLeft: 4 }}>
       <button onClick={function() { sShowSaveLoad(!showSaveLoad); sConfirmDel(null); }}
        style={{ padding: isMobile ? "5px 8px" : "5px 12px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.1)", color: "#B0D0F0", fontSize: isMobile ? 10 : 11, cursor: "pointer", whiteSpace: "nowrap" }}>{isMobile ? "💾" : "💾 Save/Load"}</button>
       {showSaveLoad && (
        <div onClick={function() { sShowSaveLoad(false); sConfirmDel(null); }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} />
       )}
       {showSaveLoad && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, width: 280, background: "white", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", zIndex: 100, padding: 12 }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: BLU }}>Save / Load Project</div>
          <button onClick={function() { newProject(); }}
           style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid " + ACC, background: "white", fontSize: 10, cursor: "pointer", color: ACC, fontWeight: 700 }}>+ New</button>
         </div>
         <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input id="flc-save-name" key={proj.name} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #DDD", fontSize: 12 }} placeholder="Project name..." defaultValue={proj.name} />
          <button onClick={function() { var n = document.getElementById("flc-save-name").value.trim(); if (n) { saveProject(n); } }}
           style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#27AE60", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>Save</button>
         </div>
         {saveMsg && (<div style={{ fontSize: 10, fontWeight: 600, color: saveMsg.indexOf("fail") >= 0 ? "#C62828" : "#27AE60", marginBottom: 6, marginTop: -4 }}>{saveMsg}</div>)}
         {savedList.length > 0 && (
          <div>
           <div style={{ fontSize: 10, fontWeight: 600, color: "#999", marginBottom: 4, textTransform: "uppercase" }}>Saved Projects</div>
           <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {savedList.map(function(name) {
             var raw = null;
             try { raw = JSON.parse(localStorage.getItem("flc_est_" + name)); } catch(e) {}
             var ts = raw && raw.ts ? new Date(raw.ts).toLocaleDateString() : "";
             var isConfirming = confirmDel === name;
             return (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 4px", borderBottom: "1px solid #F0F0F0" }}>
               <button onClick={function() { loadProject(name); }}
                style={{ flex: 1, textAlign: "left", padding: 0, border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: BLU }}>{name}</button>
               <span style={{ fontSize: 9, color: "#AAA" }}>{ts}</span>
               <button onClick={function() { duplicateProject(name); }}
                style={{ padding: "2px 6px", borderRadius: 4, border: "1px solid #B0D0F0", background: "white", fontSize: 9, cursor: "pointer", color: ACC }} title="Duplicate">📋</button>
               {isConfirming ? (
                <div style={{ display: "flex", gap: 3 }}>
                 <button onClick={function() { deleteProject(name); sConfirmDel(null); }}
                  style={{ padding: "2px 6px", borderRadius: 4, border: "none", background: "#C62828", fontSize: 9, cursor: "pointer", color: "white", fontWeight: 700 }}>Delete</button>
                 <button onClick={function() { sConfirmDel(null); }}
                  style={{ padding: "2px 6px", borderRadius: 4, border: "1px solid #DDD", background: "white", fontSize: 9, cursor: "pointer", color: "#777" }}>No</button>
                </div>
               ) : (
                <button onClick={function() { sConfirmDel(name); }}
                 style={{ padding: "2px 6px", borderRadius: 4, border: "1px solid #EF9A9A", background: "white", fontSize: 9, cursor: "pointer", color: "#C62828" }}>×</button>
               )}
              </div>
             );
            })}
           </div>
          </div>
         )}
         {savedList.length === 0 && (<div style={{ fontSize: 11, color: "#999", textAlign: "center", padding: 8 }}>No saved projects yet</div>)}
         {savedList.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid #F0F0F0" }}>
           <button onClick={exportBackup}
            style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid #DDD", background: "white", fontSize: 10, cursor: "pointer", color: "#555", fontWeight: 600 }}>↓ Backup All</button>
           <button onClick={function() { importRef.current && importRef.current.click(); }}
            style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid #DDD", background: "white", fontSize: 10, cursor: "pointer", color: "#555", fontWeight: 600 }}>↑ Import</button>
           <input ref={importRef} type="file" accept=".json" onChange={importBackup} style={{ display: "none" }} />
          </div>
         )}
        </div>
       )}
      </div>
     </div>
    </div>
   </div>
   <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "12px 10px" : "20px 16px" }}>
    {copyToast && (<div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "8px 20px", borderRadius: 20, background: BLU, color: "white", fontSize: 13, fontWeight: 700, zIndex: 200, boxShadow: "0 4px 16px rgba(0,0,0,0.25)", pointerEvents: "none" }}>{copyToast}</div>)}
    {showDashboard && (function() {
     var clients = getClientDashboard();
     return (
      <div style={card}>
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 17 : 19, fontWeight: 700, color: BLU }}>Client Dashboard</h2>
        <button onClick={function() { sShowDashboard(false); }}
         style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #DDD", background: "white", fontSize: 11, cursor: "pointer" }}>Close</button>
       </div>
       {clients.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: "#999", fontSize: 13 }}>No saved projects yet. Save a project to see client data here.</div>
       ) : (
        <div>
         <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ padding: 12, borderRadius: 8, background: LT, textAlign: "center" }}>
           <div style={{ fontSize: 10, color: "#999" }}>Total Clients</div>
           <div style={{ fontSize: 22, fontWeight: 800, color: BLU }}>{clients.length}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: LT, textAlign: "center" }}>
           <div style={{ fontSize: 10, color: "#999" }}>Total Projects</div>
           <div style={{ fontSize: 22, fontWeight: 800, color: BLU }}>{clients.reduce(function(s, c) { return s + c.count; }, 0)}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: LT, textAlign: "center" }}>
           <div style={{ fontSize: 10, color: "#999" }}>Total Pipeline</div>
           <div style={{ fontSize: 22, fontWeight: 800, color: "#2E7D32" }}>{fmt(clients.reduce(function(s, c) { return s + c.totalBid; }, 0))}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: LT, textAlign: "center" }}>
           <div style={{ fontSize: 10, color: "#999" }}>Avg Project Size</div>
           <div style={{ fontSize: 22, fontWeight: 800, color: ACC }}>{fmt(Math.round(clients.reduce(function(s, c) { return s + c.totalBid; }, 0) / Math.max(1, clients.reduce(function(s, c) { return s + c.count; }, 0))))}</div>
          </div>
         </div>
         {clients.map(function(cl) {
          var msa = cl.projects.some(function(p) { return p.msa; });
          return (
           <div key={cl.name} style={{ marginBottom: 12, borderRadius: 10, border: "1px solid " + (msa ? "#FFB74D" : "#E8E8E8"), overflow: "hidden" }}>
            <div style={{ padding: isMobile ? "8px 10px" : "10px 14px", background: msa ? "#FFF3E0" : "#F8F9FA", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
             <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: BLU }}>{cl.name}</span>
              {msa && <span style={{ marginLeft: 6, padding: "2px 6px", borderRadius: 3, background: "#E65100", color: "white", fontSize: 8, fontWeight: 700 }}>MSA</span>}
             </div>
             <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
              <span><strong>{cl.count}</strong> project{cl.count !== 1 ? "s" : ""}</span>
              <span style={{ fontWeight: 700, color: "#2E7D32" }}>{fmt(cl.totalBid)}</span>
             </div>
            </div>
            <div style={{ overflowX: "auto" }}>
             <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr style={{ background: "#FAFAFA" }}>
               <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 600, color: "#999", fontSize: 9 }}>PROJECT</th>
               <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 600, color: "#999", fontSize: 9 }}>BUILD TYPE</th>
               <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600, color: "#999", fontSize: 9 }}>SF</th>
               <th style={{ padding: "5px 8px", textAlign: "center", fontWeight: 600, color: "#999", fontSize: 9 }}>TIER</th>
               <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600, color: "#999", fontSize: 9 }}>TOTAL</th>
               <th style={{ padding: "5px 8px", textAlign: "center", fontWeight: 600, color: "#999", fontSize: 9 }}>VER</th>
              </tr></thead>
              <tbody>
               {cl.projects.map(function(p, pi) {
                return (
                 <tr key={pi} style={{ borderBottom: "1px solid #F0F0F0" }}>
                  <td style={{ padding: "5px 8px", fontWeight: 600, color: BLU }}>{p.name}{p.city ? <span style={{ fontSize: 9, color: "#AAA", marginLeft: 4 }}>{p.city}</span> : null}</td>
                  <td style={{ padding: "5px 8px", color: "#555" }}>{p.bt}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>{fmtN(p.sf)}</td>
                  <td style={{ padding: "5px 8px", textAlign: "center" }}>
                   <span style={{ padding: "1px 5px", borderRadius: 3, fontSize: 9, fontWeight: 600, background: p.tierIdx === 3 ? "#E8F5E9" : p.tierIdx > 3 ? "#E3F2FD" : "#FFF3E0", color: p.tierIdx === 3 ? "#2E7D32" : p.tierIdx > 3 ? "#1565C0" : "#E65100" }}>{p.tier}</span>
                  </td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{p.gt > 0 ? fmt(p.gt) : "—"}</td>
                  <td style={{ padding: "5px 8px", textAlign: "center", fontSize: 9, color: "#AAA" }}>v{p.versions || 1}</td>
                 </tr>
                );
               })}
              </tbody>
             </table>
            </div>
           </div>
          );
         })}
        </div>
       )}
      </div>
     );
    })()}
    {step === 0 && (
     <div style={card}>
      <h2 style={{ margin: "0 0 4px", fontSize: isMobile ? 17 : 19, fontWeight: 700, color: BLU }}>Project Information</h2>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#777" }}>Enter details. Drives pricing and scope.</p>
      <div style={g2}>
       <div><label style={lbl}>Project Name *</label><input style={inp} placeholder="e.g., Crunch Fitness - Dallas" value={proj.name} onChange={function(e) { setField("name", e.target.value); }} /></div>
       <div><label style={lbl}>Client / GC *</label><input style={inp} placeholder="Start typing..." value={proj.client} onChange={function(e) { onClient(e.target.value); }} list="cl" />
        <datalist id="cl">{CLIENTS.map(function(c) { return <option key={c.name} value={c.name} />; })}</datalist>
        {clientMatch && (<div style={{ marginTop: 5, padding: "7px 10px", borderRadius: 6, fontSize: 11, lineHeight: 1.4, background: clientMatch.msa ? "#FFF3E0" : "#E8F5E9", border: clientMatch.msa ? "1px solid #FFB74D" : "1px solid #A5D6A7" }}>{clientMatch.msa && <strong style={{ color: "#E65100" }}>MSA CLIENT - </strong>}{clientMatch.note}</div>)}
       </div>
       <div><label style={lbl}>Build Type *</label>
        <select style={inp} value={proj.bt} onChange={function(e) { setField("bt", e.target.value); }}>
         <option value="">Select...</option>
         {Object.keys(P).map(function(k) { return <option key={k} value={k}>{P[k].name}</option>; })}
        </select>
        {proj.bt && P[proj.bt] && P[proj.bt].note && <div style={{ marginTop: 3, fontSize: 10, color: "#999" }}>{P[proj.bt].note}</div>}
       </div>
       <div><label style={lbl}>Bid / Listed SF</label><input style={inp} type="number" min={0} placeholder="From Procore, BC, etc." value={proj.sf} onChange={function(e) { setField("sf", e.target.value); }} />
        <div style={{ marginTop: 3, fontSize: 10, color: "#999" }}>{drawingSF > 0 ? "Drawings SF: " + fmtN(drawingSF) + " — using drawings for pricing" : "Reference from bid docs. Drawings override if uploaded."}</div>
        {(function() {
         var checkSF = activeSF || parseInt(proj.sf) || 0;
         var range = getSFRange(proj.bt);
         if (range && checkSF > 0 && (checkSF < range.min || checkSF > range.max)) {
          return (<div style={{ marginTop: 4, padding: "5px 8px", borderRadius: 6, background: "#FFF3E0", border: "1px solid #FFB74D", fontSize: 10, color: "#E65100" }}>
           SF outside typical range for {P[proj.bt].name} ({fmtN(range.min)} – {fmtN(range.max)} SF). Rate will be extrapolated.
          </div>);
         }
         return null;
        })()}
       </div>
      </div>
      <div style={{ marginTop: 16 }}>
       <label style={lbl}>Stages Included * ({sel.length} mobilization{sel.length !== 1 ? "s" : ""})</label>
       <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 6 }}>
        {ALL_STAGES.map(function(s) {
         var on = sel.indexOf(s.id) >= 0;
         return (
          <button key={s.id} onClick={function() { toggleStage(s.id); }}
           style={{ padding: isMobile ? "10px 6px" : "10px", borderRadius: 8, border: "2px solid " + (on ? ACC : "#DDD"), background: on ? LT : "white", cursor: "pointer", textAlign: "center" }}>
           <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: on ? BLU : "#777" }}>{isMobile ? s.short : s.name}</div>
           <div style={{ fontSize: 9, color: on ? ACC : "#CCC", marginTop: 2 }}>{on ? "Included" : "+ Add"}</div>
          </button>
         );
        })}
       </div>
       <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {PRESETS.map(function(p) {
         return (
          <button key={p.label} onClick={function() { sSel(p.ids); }}
           style={{ padding: "3px 10px", borderRadius: 14, border: "1px solid #DDD", background: "white", fontSize: 10, color: "#666", cursor: "pointer" }}>
           {p.label}
          </button>
         );
        })}
       </div>
      </div>
      <div style={{ marginTop: 16 }}>
       <label style={lbl}>Internal Notes (optional)</label>
       <textarea style={Object.assign({}, inp, { minHeight: 60, resize: "vertical", fontSize: 12 })} placeholder="e.g., GC wants us on-site by March 15, competing bid from ServiceMaster..." value={proj.notes} onChange={function(e) { setField("notes", e.target.value); }} />
      </div>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : 16 }}>
       <div><label style={lbl}>Base Mobilization</label>
        <select style={inp} value={proj.baseMob} onChange={function(e) { setField("baseMob", parseInt(e.target.value)); }}>
         <option value={900}>$900 Standard</option><option value={1200}>$1,200 Extended</option><option value={1500}>$1,500 Overnight</option>
        </select>
       </div>
       <div style={{ position: "relative" }}>
        <label style={lbl}>Project City (mileage)</label>
        <input style={inp} placeholder="Type city..." value={proj.city}
         onChange={function(e) { onCity(e.target.value); }}
         onFocus={function() { if (cityResults.length) { sShowCD(true); } }}
         onBlur={function() { setTimeout(function() { sShowCD(false); if (proj.city) { var exactMatch = CITIES.find(function(c) { return c.n.toLowerCase() === proj.city.toLowerCase(); }); if (exactMatch) { pickCity(exactMatch); } else { var partial = CITIES.find(function(c) { return c.n.toLowerCase().indexOf(proj.city.toLowerCase()) === 0; }); if (partial) { pickCity(partial); } } } }, 200); }} />
        {showCityDrop && (
         <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #DDD", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", zIndex: 20, maxHeight: 200, overflowY: "auto" }}>
          {cityResults.map(function(c) {
           return (
            <div key={c.n} onMouseDown={function() { pickCity(c); }}
             style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between" }}>
             <span style={{ fontWeight: 600 }}>{c.n}</span>
             <span style={{ color: "#999" }}>{calcMiles(c.la, c.lo)} mi</span>
            </div>
           );
          })}
         </div>
        )}
        {proj.miles > 0 && (
         <div style={{ marginTop: 3, fontSize: 11, color: "#666", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <strong>{proj.miles} mi</strong> from Caddo Mills
          {showMilesInput ? (
           <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <input type="number" min={0} defaultValue={proj.miles} style={{ width: 70, padding: "3px 6px", border: "1px solid " + ACC, borderRadius: 4, fontSize: 11, outline: "none" }}
             onKeyDown={function(e) { if (e.key === "Enter") { setField("miles", parseInt(e.target.value) || 0); sShowMilesInput(false); } }}
             ref={function(el) { if (el) { el.focus(); } }} />
            <button onClick={function(e) { var inp = e.target.parentNode.querySelector('input'); setField("miles", parseInt(inp.value) || 0); sShowMilesInput(false); }}
             style={{ fontSize: 10, color: "white", background: ACC, border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}>Set</button>
            <button onClick={function() { sShowMilesInput(false); }}
             style={{ fontSize: 10, color: "#999", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
           </span>
          ) : (
           <button onClick={function() { sShowMilesInput(true); }}
            style={{ fontSize: 10, color: ACC, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Override</button>
          )}
         </div>
        )}
        {proj.city && proj.city.length >= 3 && !proj.miles && (
         <div style={{ marginTop: 4 }}>
          {showMilesInput ? (
           <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, color: "#555" }}>Miles from Caddo Mills:</span>
            <input type="number" min={0} placeholder="e.g. 250" style={{ width: 70, padding: "3px 6px", border: "1px solid " + ACC, borderRadius: 4, fontSize: 11, outline: "none" }}
             onKeyDown={function(e) { if (e.key === "Enter") { setField("miles", parseInt(e.target.value) || 0); sShowMilesInput(false); } }}
             ref={function(el) { if (el) { el.focus(); } }} />
            <button onClick={function(e) { var inp = e.target.parentNode.querySelector('input'); setField("miles", parseInt(inp.value) || 0); sShowMilesInput(false); }}
             style={{ fontSize: 10, color: "white", background: ACC, border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}>Set</button>
            <button onClick={function() { sShowMilesInput(false); }}
             style={{ fontSize: 10, color: "#999", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
           </span>
          ) : (
           <span>
            <span style={{ fontSize: 11, color: "#E67E22" }}>City not found? </span>
            <button onClick={function() { sShowMilesInput(true); }}
             style={{ fontSize: 11, color: ACC, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Enter miles manually</button>
           </span>
          )}
         </div>
        )}
       </div>
      </div>
      {proj.miles > 0 && (
       <div style={{ marginTop: 12, padding: isMobile ? 10 : 14, borderRadius: 8, background: "#F8F9FA", border: "1px solid #E8E8E8" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: BLU, marginBottom: 6 }}>Mobilization: {fmt(mc.total)}</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 6 }}>
         {[["Base", fmt(mc.base)], ["Round Trip", fmtN(mc.rt) + " mi"], ["$/Trip", fmt(mc.mpt)], ["Trips", String(mc.trips)]].map(function(pair) {
          return (
           <div key={pair[0]} style={{ textAlign: "center", padding: 6, background: "white", borderRadius: 6, border: "1px solid #EEE" }}>
            <div style={{ fontSize: 9, color: "#999" }}>{pair[0]}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: BLU }}>{pair[1]}</div>
           </div>
          );
         })}
        </div>
       </div>
      )}
      <div style={{ marginTop: 16 }}>
       <label style={lbl}>Per Diem — Crew Travel & Lodging</label>
       <div style={{ marginBottom: 6, fontSize: 11, color: "#999" }}>Auto-applies for projects over {CONFIG.PER_DIEM_THRESHOLD} days. Override below to force on shorter jobs.</div>
       <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: proj.perDiemOverride ? 0 : 10, cursor: "pointer", padding: "6px 10px", borderRadius: proj.perDiemOverride ? "6px 6px 0 0" : 6, background: proj.perDiemOverride ? "#F3E5F5" : "#F8F9FA", border: proj.perDiemOverride ? "1px solid #CE93D8" : "1px solid #E8E8E8", borderBottom: proj.perDiemOverride ? "none" : undefined, fontSize: 12, fontWeight: 600, color: proj.perDiemOverride ? "#7B1FA2" : "#666" }}>
        <input type="checkbox" checked={proj.perDiemOverride} onChange={function(e) { setField("perDiemOverride", e.target.checked); }} style={{ margin: 0 }} />
        Force per diem {proj.perDiemOverride ? "ON" : "(off — auto threshold)"} — charge regardless of duration
       </label>
       {proj.perDiemOverride && (
        <div style={{ padding: "8px 10px 10px", marginBottom: 10, borderRadius: "0 0 6px 6px", background: "#F3E5F5", border: "1px solid #CE93D8", borderTop: "none" }}>
         <label style={{ fontSize: 10, color: "#7B1FA2", display: "block", marginBottom: 3, fontWeight: 600 }}>Reason for override (internal only — not shown on scope/PDF)</label>
         <input style={Object.assign({}, inp, { background: "white", borderColor: "#CE93D8", fontSize: 12 })} placeholder="e.g., Client agreed to cover travel for 2-week job, crew driving 3+ hrs each way..." value={proj.perDiemReason} onChange={function(e) { setField("perDiemReason", e.target.value); }} />
        </div>
       )}
       <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: isMobile ? 8 : 12 }}>
        <div>
         <label style={{ fontSize: 10, color: "#777", display: "block", marginBottom: 3 }}>Crews (4 per crew) {!parseInt(proj.crewSize) && autoCrews > 0 ? "(auto: " + autoCrews + ")" : ""}</label>
         <input style={Object.assign({}, inp, !parseInt(proj.crewSize) && autoCrews > 0 ? { background: "#F3E8FF", borderColor: "#CE93D8" } : {})} type="number" min={0} placeholder={"Auto: " + (autoCrews || "—") + " crew" + (autoCrews > 1 ? "s" : "")} value={proj.crewSize} onChange={function(e) { setField("crewSize", e.target.value); }} />
        </div>
        <div>
         <label style={{ fontSize: 10, color: "#777", display: "block", marginBottom: 3 }}>Per Diem Rate ($/day) {proj.city && !parseFloat(proj.perDiemRate) ? "(auto: $" + getPerDiemRate(proj.city) + ")" : ""}</label>
         <input style={Object.assign({}, inp, proj.city && !parseFloat(proj.perDiemRate) ? { background: "#F3E8FF", borderColor: "#CE93D8" } : {})} type="number" min={0} placeholder={proj.city ? "GSA: $" + getPerDiemRate(proj.city) : "Select city first"} value={proj.perDiemRate} onChange={function(e) { setField("perDiemRate", e.target.value); }} />
         {proj.city && <div style={{ fontSize: 9, color: "#7B1FA2", marginTop: 2 }}>GSA rate for {proj.city}: ${getPerDiemRate(proj.city)}/day (hotel + meals)</div>}
        </div>
        <div>
         <label style={{ fontSize: 10, color: "#777", display: "block", marginBottom: 3 }}>Duration Override (days)</label>
         <input style={inp} type="number" min={0} placeholder={pr && pr.estDays > 0 ? "Auto: ~" + pr.estDays + " days" : "Enter days"} value={proj.daysOverride} onChange={function(e) { setField("daysOverride", e.target.value); }} />
        </div>
       </div>
       {pr && pr.crews > 0 && (function() {
        var cs = pr.crews;
        var hc = pr.headcount;
        var pdr = pr.perDiemRate;
        var ed = pr.estDays;
        var pd = pr.projDays;
        var applies = pr.perDiemApplies;
        return (
         <div style={{ marginTop: 8, padding: isMobile ? 10 : 14, borderRadius: 8, background: applies ? "#F3E5F5" : "#F8F9FA", border: applies ? "1px solid #CE93D8" : "1px solid #E8E8E8" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)", gap: 6, marginBottom: applies ? 8 : 0 }}>
           <div style={{ textAlign: "center", padding: 6, background: "white", borderRadius: 6, border: "1px solid #EEE" }}>
            <div style={{ fontSize: 9, color: "#999" }}>Crews × 4</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: BLU }}>{cs} crew{cs > 1 ? "s" : ""} ({hc} ppl)</div>
           </div>
           <div style={{ textAlign: "center", padding: 6, background: "white", borderRadius: 6, border: "1px solid #EEE" }}>
            <div style={{ fontSize: 9, color: "#999" }}>Crew-Days</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: BLU }}>{pr.cd.toFixed(1)}</div>
           </div>
           <div style={{ textAlign: "center", padding: 6, background: "white", borderRadius: 6, border: "1px solid #EEE" }}>
            <div style={{ fontSize: 9, color: "#999" }}>Est. Calendar Days</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: BLU }}>{ed > 0 ? "~" + ed : "—"}</div>
           </div>
           <div style={{ textAlign: "center", padding: 6, background: "white", borderRadius: 6, border: "1px solid #EEE" }}>
            <div style={{ fontSize: 9, color: "#999" }}>Using Duration</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: pd > 21 ? "#7B1FA2" : BLU }}>{pd > 0 ? pd + " days" : "—"}{parseInt(proj.daysOverride) > 0 ? " ✎" : ""}</div>
           </div>
           <div style={{ textAlign: "center", padding: 6, background: "white", borderRadius: 6, border: "1px solid #EEE" }}>
            <div style={{ fontSize: 9, color: "#999" }}>Per Diem Status</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: applies ? "#7B1FA2" : "#999" }}>{applies && pd <= CONFIG.PER_DIEM_THRESHOLD ? "Override ✎" : pd <= CONFIG.PER_DIEM_THRESHOLD ? "Under " + CONFIG.PER_DIEM_THRESHOLD + " days" : (pdr > 0 ? "Active" : "Enter rate")}</div>
           </div>
          </div>
          {applies && (
           <div style={{ padding: "8px 12px", borderRadius: 6, background: "#7B1FA2", color: "white", textAlign: "center" }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>{hc} people × ${pdr}/day × {pd} days</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>Per Diem: {fmt(hc * pdr * pd)}</div>
           </div>
          )}
          {pd > 0 && pd <= CONFIG.PER_DIEM_THRESHOLD && pdr > 0 && !proj.perDiemOverride && (
           <div style={{ marginTop: 6, fontSize: 11, color: "#2E7D32", fontWeight: 600 }}>Project under {CONFIG.PER_DIEM_THRESHOLD} days — no per diem applied. Use override to force.</div>
          )}
          {pd > 0 && pd <= CONFIG.PER_DIEM_THRESHOLD && pdr > 0 && proj.perDiemOverride && (
           <div style={{ marginTop: 6, fontSize: 11, color: "#7B1FA2", fontWeight: 600 }}>Override active — per diem charged despite {pd}-day duration.{proj.perDiemReason ? " Reason: " + proj.perDiemReason : ""}</div>
          )}
         </div>
        );
       })()}
      </div>
      <div style={{ marginTop: 16 }}>
       <label style={lbl}>Exterior Power Wash (optional)</label>
       {exteriorSF > 0 && (
        <div style={{ marginBottom: 8, padding: "7px 10px", borderRadius: 6, background: "#FFF8E1", border: "1px solid #FFD54F", fontSize: 11, color: "#F57F17" }}>
         <strong>{fmtN(exteriorSF)} SF</strong> auto-detected from drawings (EXT areas). Add more below if needed.
        </div>
       )}
       <div style={g2}>
        <div>
         <input style={inp} type="number" min={0} placeholder={exteriorSF > 0 ? "Additional exterior SF (optional)" : "Exterior SF (parking, sidewalks)"} value={proj.extSF} onChange={function(e) { setField("extSF", e.target.value); }} />
         {(parseInt(proj.extSF) > 0 || exteriorSF > 0) && (
          <div style={{ marginTop: 4, fontSize: 11, color: "#666" }}>
           {(function() { var tot = exteriorSF + (parseInt(proj.extSF) || 0); var r = 0.30; for (var eb = 0; eb < CONFIG.EXT_BANDS.length; eb++) { if (tot >= CONFIG.EXT_BANDS[eb][0] && tot <= CONFIG.EXT_BANDS[eb][1]) { r = CONFIG.EXT_BANDS[eb][2]; break; } } return "Total ext: " + fmtN(tot) + " SF × " + fmtR(r) + "/SF = " + fmt(tot * r); })()}
          </div>
         )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
         <input type="checkbox" checked={proj.extTire} onChange={function(e) { setField("extTire", e.target.checked); }} />
         <div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Tire Track Removal</div>
          <div style={{ fontSize: 10, color: "#999" }}>+{fmtR(CONFIG.EXT_TIRE_ADDON)}/SF addon</div>
          {proj.extTire && (exteriorSF + (parseInt(proj.extSF) || 0)) > 0 && (<div style={{ fontSize: 10, color: ACC }}>+{fmt((exteriorSF + (parseInt(proj.extSF) || 0)) * CONFIG.EXT_TIRE_ADDON)}</div>)}
         </div>
        </div>
       </div>
      </div>
      <div style={{ marginTop: 16 }}>
       <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <input type="checkbox" checked={proj.winEnabled} onChange={function(e) { setField("winEnabled", e.target.checked); }} style={{ margin: 0 }} />
        <label style={{ fontWeight: 700, fontSize: 13, color: BLU }}>Exterior Window Cleaning (300+ panes)</label>
       </div>
       {proj.winEnabled && (
        <div style={{ padding: isMobile ? 10 : 14, border: "1px solid #B3D4FC", borderRadius: 10, background: "#F0F7FF" }}>
         <div style={g2}>
          <div>
           <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3, color: "#555" }}>Number of Panes</div>
           <input style={inp} type="number" min={0} placeholder="e.g. 450" value={proj.winPanes} onChange={function(e) { setField("winPanes", e.target.value); }} />
          </div>
          <div>
           <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3, color: "#555" }}>Building Height</div>
           <select style={inp} value={proj.winHeight} onChange={function(e) { setField("winHeight", e.target.value); }}>
            <option value="floor">Floor Level — $30/pane</option>
            <option value="standard">Standard (1-3 Stories) — $37/pane</option>
            <option value="stretch">Stretch (3-4 Stories) — $48/pane</option>
            <option value="luxury">Luxury / High-Finish — $66/pane</option>
            <option value="hotel">Hotel / Condo Exterior — $26/pane</option>
           </select>
          </div>
         </div>
         {parseInt(proj.winPanes) > 0 && (
          <div style={{ marginTop: 10 }}>
           <div style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>
            {fmtN(parseInt(proj.winPanes))} panes × {fmtR((CONFIG.WIN_TIERS[proj.winHeight] || CONFIG.WIN_TIERS.standard))}/pane = {fmt((parseInt(proj.winPanes) || 0) * ((CONFIG.WIN_TIERS[proj.winHeight] || CONFIG.WIN_TIERS.standard)))}
           </div>
           <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: proj.winSeparate ? "2px solid " + ACC : "1px solid #CCC", background: proj.winSeparate ? LT : "white", cursor: "pointer", flex: 1 }}>
             <input type="radio" name="winMode" checked={proj.winSeparate} onChange={function() { setField("winSeparate", true); }} />
             <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Price Separately</div>
              <div style={{ fontSize: 10, color: "#777" }}>Own line item on estimate</div>
             </div>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: !proj.winSeparate ? "2px solid #27AE60" : "1px solid #CCC", background: !proj.winSeparate ? "#E8F5E9" : "white", cursor: "pointer", flex: 1 }}>
             <input type="radio" name="winMode" checked={!proj.winSeparate} onChange={function() { setField("winSeparate", false); }} />
             <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Bundle (Added Value)</div>
              <div style={{ fontSize: 10, color: "#777" }}>Absorb into interior $/SF</div>
             </div>
            </label>
           </div>
           {!proj.winSeparate && activeSF > 0 && (
            <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "#E8F5E9", border: "1px solid #A5D6A7", fontSize: 11, color: "#2E7D32" }}>
             Added value: +{fmtR((parseInt(proj.winPanes) || 0) * ((CONFIG.WIN_TIERS[proj.winHeight] || CONFIG.WIN_TIERS.standard)) / (activeSF || 1))}/SF absorbed — client sees windows included at no extra charge
            </div>
           )}
          </div>
         )}
        </div>
       )}
      </div>
      {pr && (
       <div style={{ marginTop: 14, padding: isMobile ? 14 : 18, borderRadius: 10, background: "linear-gradient(135deg, " + BLU + ", #0D1F38)", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
         <div>
          <div style={{ fontSize: 10, opacity: 0.6 }}>PREVIEW - {TIERS[tier]}</div>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, marginTop: 2 }}>{fmt(pr.gt)}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{fmtR(pr.rate)}{pr.winBundledPerSF > 0 ? " (+" + fmtR(pr.winBundledPerSF) + " win)" : ""}/SF + {fmt(pr.mob.total)} mob{pr.extTotal > 0 ? (" + " + fmt(pr.extTotal) + " ext") : ""}{pr.winTotal > 0 && pr.winSeparate ? (" + " + fmt(pr.winTotal) + " win") : ""}{pr.perDiemApplies ? (" + " + fmt(pr.perDiemTotal) + " per diem") : ""}</div>
          {drawingSF > 0 && <div style={{ fontSize: 9, opacity: 0.5, marginTop: 2 }}>Int: {fmtN(interiorSF)} SF{exteriorSF > 0 ? " + Ext: " + fmtN(exteriorSF) + " SF" : ""}{parseInt(proj.sf) > 0 ? " (Bid: " + fmtN(parseInt(proj.sf)) + ")" : ""}</div>}
         </div>
         <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, opacity: 0.6 }}>Crew-Days</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{pr.cd.toFixed(1)}</div>
         </div>
        </div>
       </div>
      )}
      <div style={bRow}>
       <div>{!canNext && <span style={{ fontSize: 11, color: "#999" }}>Fill in {[!proj.name && "name", !proj.client && "client", !proj.bt && "build type", !(proj.sf || drawingSF > 0) && "SF", sel.length === 0 && "stages"].filter(Boolean).join(", ")} to continue</span>}</div>
       <button onClick={function() { setStep(1); }} disabled={!canNext}
        style={{ display: "inline-block", padding: isMobile ? "10px 16px" : "11px 24px", borderRadius: 10, border: "none", background: ACC, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: canNext ? 1 : 0.5 }}>Next: Drawings</button>
      </div>
     </div>
    )}
    {step === 1 && (
     <div style={card}>
      <h2 style={{ margin: "0 0 4px", fontSize: isMobile ? 17 : 19, fontWeight: 700, color: BLU }}>Upload Drawings</h2>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#777" }}>Upload construction plan PDFs or images. Multi-page PDFs are split automatically — each page is analyzed in parallel.</p>
      <div onClick={function() { if (fileRef.current) { fileRef.current.click(); } }}
       style={{ border: "2px dashed #CCC", borderRadius: 12, padding: isMobile ? 20 : 36, textAlign: "center", cursor: "pointer", background: "#FAFAFA" }}>
       <div style={{ fontSize: 28 }}>&#128206;</div>
       <div style={{ fontSize: 13, fontWeight: 600, color: BLU, marginTop: 4 }}>Tap or drag to upload</div>
       <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>PDF, PNG, JPG — Multiple OK</div>
       <input ref={fileRef} type="file" multiple accept="application/pdf,image/*" style={{ display: "none" }} onChange={handleFiles} />
      </div>
      {imgs.length > 0 && (
       <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {imgs.map(function(img, i) {
         return (
          <div key={i} style={{ position: "relative", width: isMobile ? 70 : 110, borderRadius: 8, overflow: "hidden", border: "1px solid #DDD", background: img.isPDF ? "#FFF3E0" : "#FFF" }}>
           {img.isPDF ? (
            <div style={{ padding: "10px 6px", textAlign: "center" }}>
             <div style={{ fontSize: 24 }}>&#128196;</div>
             <div style={{ fontSize: 9, fontWeight: 600, color: "#E65100", marginTop: 2 }}>PDF</div>
             <div style={{ fontSize: 8, color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.name}</div>
             <div style={{ fontSize: 8, color: "#BBB" }}>{img.sizeMB} MB</div>
            </div>
           ) : (
            <img src={img.preview} alt="" style={{ width: "100%", height: isMobile ? 45 : 70, objectFit: "cover" }} />
           )}
           <button onClick={function() { sImgs(function(prev) { return prev.filter(function(_, j) { return j !== i; }); }); }}
            style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
          </div>
         );
        })}
       </div>
      )}
      {extractErr && (function() {
       var isProgress = extracting;
       var isSuccess = !extracting && extractErr.indexOf("Processed") === 0;
       var bg = isProgress ? "#E3F2FD" : (isSuccess ? "#E8F5E9" : "#FFF3E0");
       var border = isProgress ? "1px solid #90CAF9" : (isSuccess ? "1px solid #A5D6A7" : "1px solid #FFB74D");
       var color = isProgress ? "#1565C0" : (isSuccess ? "#2E7D32" : "#E65100");
       var label = isProgress ? "Progress:" : (isSuccess ? "✓ Success:" : "Extraction Issue:");
       return (<div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: bg, border: border, fontSize: 12, color: color }}><strong>{label}</strong> {extractErr}</div>);
      })()}
      <div style={bRow}>
       <button onClick={function() { setStep(0); }} style={bSecondary}>Back</button>
       <div style={{ display: "flex", gap: 8 }}>
        <button onClick={function() { sAreas([{ floor: "Level 1", area: "Main Area", sf: parseInt(proj.sf) || 10000, floorType: "TBD", special: "none", zone: "interior" }]); setStep(2); }} style={bSecondary}>Skip - Manual</button>
        <button onClick={extractData} disabled={imgs.length === 0 || extracting} style={{ display: "inline-block", padding: isMobile ? "10px 16px" : "11px 24px", borderRadius: 10, border: "none", background: ACC, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: imgs.length > 0 ? 1 : 0.5 }}>{extracting ? "Analyzing..." : "Extract with AI"}</button>
       </div>
      </div>
     </div>
    )}
    {step === 2 && (
     <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
       <div>
        <h2 style={{ margin: 0, fontSize: isMobile ? 17 : 19, fontWeight: 700, color: BLU }}>Review Data</h2>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#777" }}>{areas.length} areas across {(function() { var f = {}; areas.forEach(function(a) { f[a.floor] = 1; }); return Object.keys(f).length; })()} floors</p>
       </div>
       <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #DDD" }}>
        <button onClick={function() { sReviewView("summary"); }} style={{ padding: "6px 14px", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", background: reviewView === "summary" ? BLU : "white", color: reviewView === "summary" ? "white" : "#777" }}>By Level</button>
        <button onClick={function() { sReviewView("detail"); }} style={{ padding: "6px 14px", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", background: reviewView === "detail" ? BLU : "white", color: reviewView === "detail" ? "white" : "#777" }}>All Areas</button>
       </div>
      </div>
      {/* Bulk Edit Toolbar */}
      {areas.some(function(a) { return a.floorType === "TBD"; }) && (
       <div style={{ marginBottom: 10, padding: isMobile ? "8px 10px" : "8px 14px", borderRadius: 8, background: "#FFF3E0", border: "1px solid #FFB74D", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#E65100" }}>{areas.filter(function(a) { return a.floorType === "TBD"; }).length} TBD areas →</span>
        {["Polished Concrete", "VCT", "Carpet", "Tile", "Epoxy", "LVP", "Rubber"].map(function(ft) {
         return (
          <button key={ft} onClick={function() { bulkSetFloorType("TBD", ft); }}
           style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid #FFB74D", background: "white", fontSize: 10, cursor: "pointer", color: "#E65100" }}>{ft}</button>
         );
        })}
       </div>
      )}
      {/* Duplicate Check */}
      <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
       <button onClick={function() { sDupeResults(getDuplicateWarnings()); }}
        style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #DDD", background: "white", fontSize: 11, cursor: "pointer", fontWeight: 600, color: "#555" }}>Check Duplicates</button>
       {dupeResults !== null && dupeResults.length === 0 && (<span style={{ fontSize: 11, color: "#2E7D32", fontWeight: 600 }}>No duplicates found</span>)}
       {dupeResults !== null && dupeResults.length > 0 && (<span style={{ fontSize: 11, color: "#C62828", fontWeight: 600 }}>{dupeResults.length} duplicate{dupeResults.length > 1 ? "s" : ""} found</span>)}
      </div>
      {dupeResults !== null && dupeResults.length > 0 && (
       <div style={{ marginBottom: 10, padding: isMobile ? "8px 10px" : "8px 14px", borderRadius: 8, background: "#FFEBEE", border: "1px solid #EF9A9A" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
         <div style={{ fontSize: 11, fontWeight: 700, color: "#C62828" }}>Exact Duplicates</div>
         <button onClick={function() { sDupeResults(null); }} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #EF9A9A", background: "white", fontSize: 9, cursor: "pointer", color: "#C62828" }}>Dismiss</button>
        </div>
        {dupeResults.map(function(d, di) {
         return (
          <div key={di} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
           <span style={{ fontSize: 10, color: "#C62828" }}>{d.floor} → "{d.area}" is an exact duplicate at rows {d.i + 1} & {d.j + 1}</span>
           <button onClick={function() { sAreas(function(prev) { return prev.filter(function(_, idx) { return idx !== d.j; }); }); sDupeResults(null); }}
            style={{ padding: "2px 6px", borderRadius: 4, border: "1px solid #EF9A9A", background: "white", fontSize: 9, cursor: "pointer", color: "#C62828" }}>Remove #{d.j + 1}</button>
          </div>
         );
        })}
       </div>
      )}
      {reviewView === "summary" && (function() {
       var floorOrder = [];
       var floorMap = {};
       areas.forEach(function(a, i) {
        if (!floorMap[a.floor]) { floorMap[a.floor] = { areas: [], indices: [] }; floorOrder.push(a.floor); }
        floorMap[a.floor].areas.push(a);
        floorMap[a.floor].indices.push(i);
       });
       return (
        <div>
         {floorOrder.map(function(fl) {
          var grp = floorMap[fl];
          var totalSF = 0;
          var ftMap = {};
          var hasExt = false;
          var hasInt = false;
          grp.areas.forEach(function(a) {
           var sf = parseInt(a.sf) || 0;
           totalSF += sf;
           var ft = a.floorType || "TBD";
           if (!ftMap[ft]) { ftMap[ft] = 0; }
           ftMap[ft] += sf;
           if (a.zone === "exterior") { hasExt = true; } else { hasInt = true; }
          });
          var zoneColor = hasExt && !hasInt ? "#F57F17" : (hasExt && hasInt ? "#FF9800" : ACC);
          var zoneLabel = hasExt && !hasInt ? "EXT" : (hasExt && hasInt ? "MIXED" : "INT");
          var zoneBg = hasExt && !hasInt ? "#FFF8E1" : (hasExt && hasInt ? "#FFF3E0" : "white");
          return (
           <div key={fl} style={{ marginBottom: 6, padding: isMobile ? "10px 10px" : "10px 14px", borderRadius: 8, background: zoneBg, border: "1px solid #E8E8E8", borderLeft: "4px solid " + zoneColor }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
             <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: BLU }}>{fl}</span>
              <span style={{ padding: "2px 7px", borderRadius: 4, background: zoneColor, color: "white", fontSize: 9, fontWeight: 700 }}>{zoneLabel}</span>
              <span style={{ fontSize: 11, color: "#999" }}>{grp.areas.length} area{grp.areas.length !== 1 ? "s" : ""}</span>
             </div>
             <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: BLU }}>{fmtN(totalSF)} SF</span>
              <button onClick={function() { sAreas(function(prev) { return prev.filter(function(a) { return a.floor !== fl; }); }); }}
               style={{ background: "none", border: "none", color: "#C0392B", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: "2px 6px" }}>✕ Remove</button>
             </div>
            </div>
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
             {Object.keys(ftMap).map(function(ft) {
              return (
               <span key={ft} style={{ padding: "3px 8px", borderRadius: 4, background: ft === "TBD" ? "#FFE0E0" : "#F0F0F0", fontSize: 10, color: "#555" }}>
                {ft}: <strong>{fmtN(ftMap[ft])}</strong> SF
               </span>
              );
             })}
            </div>
           </div>
          );
         })}
         <div style={{ marginTop: 10, padding: isMobile ? 10 : 12, borderRadius: 8, background: "#F5F5F5", border: "1px solid #E0E0E0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 6 }}>FLOOR TYPE TOTALS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
           {(function() {
            var gft = {};
            areas.forEach(function(a) {
             var ft = a.floorType || "TBD";
             if (!gft[ft]) { gft[ft] = 0; }
             gft[ft] += (parseInt(a.sf) || 0);
            });
            return Object.keys(gft).sort(function(a, b) { return gft[b] - gft[a]; }).map(function(ft) {
             return (
              <span key={ft} style={{ padding: "4px 10px", borderRadius: 6, background: ft === "TBD" ? "#FFE0E0" : "white", border: "1px solid #DDD", fontSize: 11 }}>
               <strong>{ft}</strong>: {fmtN(gft[ft])} SF
              </span>
             );
            });
           })()}
          </div>
         </div>
        </div>
       );
      })()}
      {reviewView === "detail" && (
       <div>
        <div style={{ overflowX: "auto" }}>
         <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
          <thead><tr style={{ background: BLU }}>
           {["Floor", "Area", "SF", "Floor Type", "Zone", ""].map(function(h) { return <th key={h} style={{ color: "white", padding: "7px 8px", textAlign: "left", fontSize: 10, fontWeight: 600 }}>{h}</th>; })}
          </tr></thead>
          <tbody>
           {areas.map(function(a, i) {
            var isExt = a.zone === "exterior";
            var ci = { width: "100%", padding: "4px 6px", border: "1px solid transparent", borderRadius: 4, fontSize: 12, background: "transparent", outline: "none", boxSizing: "border-box" };
            return (
             <tr key={i} style={{ background: isExt ? "#FFF8E1" : (i % 2 ? "white" : "#FAFAFA"), borderBottom: "1px solid #EEE", borderLeft: isExt ? "3px solid #F57F17" : "3px solid " + ACC }}>
              <td style={{ padding: "3px 4px" }}><input style={ci} value={a.floor} onChange={function(e) { editArea(i, "floor", e.target.value); }} /></td>
              <td style={{ padding: "3px 4px" }}><input style={ci} value={a.area} onChange={function(e) { editArea(i, "area", e.target.value); }} /></td>
              <td style={{ padding: "3px 4px" }}><input style={ci} type="number" min={0} value={a.sf} onChange={function(e) { editArea(i, "sf", parseInt(e.target.value) || 0); }} /></td>
              <td style={{ padding: "3px 4px" }}><input style={ci} value={a.floorType} onChange={function(e) { editArea(i, "floorType", e.target.value); }} /></td>
              <td style={{ padding: "3px 4px" }}>
               <button onClick={function() { editArea(i, "zone", isExt ? "interior" : "exterior"); }}
                style={{ padding: "3px 8px", borderRadius: 4, border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer", background: isExt ? "#F57F17" : ACC, color: "white", minWidth: 36 }}>
                {isExt ? "EXT" : "INT"}
               </button>
              </td>
              <td style={{ padding: "3px" }}><button onClick={function() { sAreas(function(prev) { return prev.filter(function(_, j) { return j !== i; }); }); }} style={{ background: "none", border: "none", color: "#C0392B", cursor: "pointer", fontSize: 13 }}>x</button></td>
             </tr>
            );
           })}
          </tbody>
         </table>
        </div>
        <button onClick={function() { sAreas(function(prev) { return prev.concat([{ floor: "Level 1", area: "New Area", sf: 0, floorType: "TBD", special: "none", zone: "interior" }]); }); }}
         style={{ marginTop: 8, padding: "5px 12px", border: "1px dashed " + ACC, borderRadius: 6, background: "none", color: ACC, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>+ Add Area</button>
        {areas.length > 3 && (
         <button onClick={function() { if (areas.length > 0) { sAreas([]); sDupeResults(null); } }}
          style={{ marginTop: 8, marginLeft: 8, padding: "5px 12px", border: "1px dashed #EF9A9A", borderRadius: 6, background: "none", color: "#C62828", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Clear All</button>
        )}
       </div>
      )}
      <div style={{ marginTop: 10, padding: isMobile ? 10 : 14, borderRadius: 8, background: LT, border: "1px solid #B3D4FC" }}>
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
         <div style={{ fontSize: 11, fontWeight: 600, color: ACC }}>INTERIOR SF (pricing)</div>
         <div style={{ fontSize: 22, fontWeight: 800, color: BLU }}>{fmtN(interiorSF)}</div>
         <div style={{ fontSize: 10, color: "#999" }}>{areas.filter(function(a) { return a.zone !== "exterior"; }).length} areas — scrubbers & floor machines</div>
        </div>
        <div style={{ textAlign: isMobile ? "left" : "center" }}>
         <div style={{ fontSize: 11, fontWeight: 600, color: "#F57F17" }}>EXTERIOR SF (power wash)</div>
         <div style={{ fontSize: 22, fontWeight: 800, color: "#F57F17" }}>{fmtN(exteriorSF)}</div>
         <div style={{ fontSize: 10, color: "#999" }}>{areas.filter(function(a) { return a.zone === "exterior"; }).length} areas — parking, walks, etc.</div>
        </div>
        {parseInt(proj.sf) > 0 && (
         <div style={{ textAlign: isMobile ? "left" : "right" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>BID / LISTED SF</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#999" }}>{fmtN(parseInt(proj.sf))}</div>
          <div style={{ fontSize: 10, color: (function() { var pct = Math.abs(drawingSF - parseInt(proj.sf)) / parseInt(proj.sf) * 100; return pct > 10 ? "#E65100" : "#2E7D32"; })() }}>
           {(function() { var diff = drawingSF - parseInt(proj.sf); return "Total: " + fmtN(drawingSF) + " (" + (diff >= 0 ? "+" : "") + (diff / parseInt(proj.sf) * 100).toFixed(1) + "%)"; })()}
          </div>
         </div>
        )}
       </div>
       <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ padding: "4px 10px", borderRadius: 4, background: ACC, color: "white", fontSize: 10, fontWeight: 600 }}>INT = blue</div>
        <div style={{ padding: "4px 10px", borderRadius: 4, background: "#F57F17", color: "white", fontSize: 10, fontWeight: 600 }}>EXT = orange</div>
        <div style={{ padding: "4px 10px", borderRadius: 4, background: "#FF9800", color: "white", fontSize: 10, fontWeight: 600 }}>MIXED = both</div>
       </div>
       {parseInt(proj.sf) > 0 && Math.abs(drawingSF - parseInt(proj.sf)) / parseInt(proj.sf) > 0.10 && (
        <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "#FFF3E0", border: "1px solid #FFB74D", fontSize: 11, color: "#E65100" }}>
         Over 10% difference — remove areas not in scope (renovation), or verify bid SF is correct.
        </div>
       )}
      </div>
      <div style={bRow}>
       <button onClick={function() { setStep(1); }} style={bSecondary}>Back</button>
       <button onClick={function() { setStep(3); }} style={bPrimary}>Pricing</button>
      </div>
     </div>
    )}
    {step === 3 && !pr && (
     <div style={card}>
      <h2 style={{ margin: "0 0 8px", fontSize: isMobile ? 17 : 19, fontWeight: 700, color: BLU }}>Pricing</h2>
      <div style={{ padding: 20, textAlign: "center", color: "#999" }}>
       <div style={{ fontSize: 14, marginBottom: 8 }}>Cannot calculate pricing yet.</div>
       <div style={{ fontSize: 12 }}>Make sure you have a <strong>build type</strong>, <strong>square footage</strong> (or uploaded drawings), and at least one <strong>stage</strong> selected.</div>
       <button onClick={function() { setStep(0); }} style={{ marginTop: 16, display: "inline-block", padding: "10px 20px", borderRadius: 10, border: "1px solid #DDD", background: "white", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← Back to Project Info</button>
      </div>
     </div>
    )}
    {step === 3 && pr && (
     <div>
      <div style={card}>
       <h2 style={{ margin: "0 0 4px", fontSize: isMobile ? 17 : 19, fontWeight: 700, color: BLU }}>Pricing - {P[proj.bt] ? P[proj.bt].name : ""}</h2>
       <div style={{ fontSize: 12, color: "#777", marginBottom: 10 }}>{fmtN(interiorSF || activeSF)} SF interior{exteriorSF > 0 ? " + " + fmtN(pr.extSF) + " SF exterior" : ""}</div>
       <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(6, 1fr)", gap: isMobile ? 4 : 8 }}>
        {pr.ar.map(function(r, i) {
         return (
          <button key={i} onClick={function() { sTier(i); }}
           style={{ padding: isMobile ? "8px 2px" : "12px 6px", borderRadius: 8, border: "2px solid " + (i === tier ? ACC : "#E0E0E0"), background: i === tier ? LT : (i === 3 ? "#F0FFF0" : "white"), cursor: "pointer", textAlign: "center" }}>
           <div style={{ fontSize: isMobile ? 9 : 10, fontWeight: 600, color: i === tier ? ACC : (i === 3 ? "#27AE60" : "#999") }}>{r.tier}</div>
           <div style={{ fontSize: isMobile ? 13 : 17, fontWeight: 800, color: i === tier ? BLU : "#333", marginTop: 1 }}>{fmtR(r.rate)}</div>
           <div style={{ fontSize: isMobile ? 9 : 10, color: "#AAA" }}>/SF</div>
           <div style={{ fontSize: isMobile ? 10 : 12, fontWeight: 600, color: i === tier ? ACC : "#777", marginTop: 3 }}>{fmt(r.total)}</div>
          </button>
         );
        })}
       </div>
       {tier !== 3 && (
        <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6, background: "#FFF3E0", border: "1px solid #FFB74D" }}>
         <div style={{ fontSize: 11, color: "#E67E22", fontWeight: 600, marginBottom: 4 }}>Pricing set to {TIERS[tier]} — not BLU Standard</div>
         <input style={Object.assign({}, inp, { background: "white", borderColor: "#FFB74D", fontSize: 12 })} placeholder="Reason: e.g., Competing bid at $1.20/SF, repeat client discount, GC budget cap..." value={proj.tierReason} onChange={function(e) { setField("tierReason", e.target.value); }} />
         {!proj.tierReason && <div style={{ fontSize: 10, color: "#E67E22", marginTop: 3 }}>Please note why this is not BLU Standard (internal only).</div>}
        </div>
       )}
      </div>
      <div style={g2}>
       <div style={card}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: BLU }}>Breakout</h3>
        {sel.map(function(id) {
         var s = ALL_STAGES.find(function(x) { return x.id === id; });
         return (
          <div key={id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F0F0F0" }}>
           <span style={{ fontSize: 13, fontWeight: 600 }}>{isMobile ? s.short : s.name}</span>
           <span style={{ fontSize: 14, fontWeight: 700 }}>{fmt(pr.br[id])}</span>
          </div>
         );
        })}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F0F0F0" }}>
         <span style={{ fontSize: 13, fontWeight: 600, color: "#666" }}>Mob/Travel</span>
         <span style={{ fontSize: 14, fontWeight: 700 }}>{fmt(pr.mob.total)}</span>
        </div>
        {pr.st > 0 && (
         <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F0F0F0" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#E67E22" }}>Surcharges</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#E67E22" }}>+{fmt(pr.st)}</span>
         </div>
        )}
        {pr.extTotal > 0 && (
         <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F0F0F0" }}>
          <div>
           <span style={{ fontSize: 13, fontWeight: 600, color: "#2E7D32" }}>Exterior PWash</span>
           <div style={{ fontSize: 9, color: "#999" }}>{fmtN(pr.extSF)} SF x {fmtR(pr.extRate)}</div>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#2E7D32" }}>+{fmt(pr.extTotal)}</span>
         </div>
        )}
        {pr.winPanes > 0 && (
         <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F0F0F0" }}>
          <div>
           <span style={{ fontSize: 13, fontWeight: 600, color: pr.winSeparate ? "#1565C0" : "#2E7D32" }}>Ext. Windows</span>
           <div style={{ fontSize: 9, color: "#999" }}>{fmtN(pr.winPanes)} panes x {fmtR(pr.winRate)}{!pr.winSeparate ? " (bundled)" : ""}</div>
          </div>
          {pr.winSeparate ? (
           <span style={{ fontSize: 14, fontWeight: 700, color: "#1565C0" }}>+{fmt(pr.winTotal)}</span>
          ) : (
           <span style={{ fontSize: 12, fontWeight: 600, color: "#2E7D32" }}>Included</span>
          )}
         </div>
        )}
        {pr.perDiemApplies && (
         <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F0F0F0" }}>
          <div>
           <span style={{ fontSize: 13, fontWeight: 600, color: "#7B1FA2" }}>Per Diem</span>
           <div style={{ fontSize: 9, color: "#999" }}>{pr.crews} crew{pr.crews > 1 ? "s" : ""} ({pr.headcount} ppl) × ${pr.perDiemRate}/day × {pr.projDays} days</div>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#7B1FA2" }}>+{fmt(pr.perDiemTotal)}</span>
         </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
         <span style={{ fontSize: 15, fontWeight: 800, color: BLU }}>TOTAL</span>
         <span style={{ fontSize: 19, fontWeight: 800, color: BLU }}>{fmt(pr.gt)}</span>
        </div>
       </div>
       <div>
        <div style={{ background: "white", borderRadius: 12, padding: pad, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16 }}>
         <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: BLU }}>Margin Calculator</h3>
         {(function() {
          var laborCost = Math.round(pr.cd * CONFIG.CREW_DAY_COST);
          var laborRevenue = Math.round(pr.cd * CONFIG.CREW_DAY_RATE);
          // Mob actual cost: drive time labor + gas
          var rtMiles = pr.mob.rt;
          var trips = pr.mob.trips;
          var driveHrsPerTrip = rtMiles / CONFIG.AVG_DRIVE_SPEED;
          var mobLaborPerTrip = driveHrsPerTrip * (CONFIG.DRIVER_RATE + CONFIG.PASSENGER_RATE * CONFIG.PASSENGER_COUNT);
          var mobGasPerTrip = rtMiles / CONFIG.TRUCK_MPG * CONFIG.DIESEL_PRICE;
          var mobCostPerTrip = mobLaborPerTrip + mobGasPerTrip;
          var mobActualCost = Math.round(mobCostPerTrip * trips);
          var mobRevenue = pr.mob.total;
          var mobProfit = mobRevenue - mobActualCost;
          var perDiemCost = pr.perDiemApplies ? pr.perDiemTotal : 0;
          var totalCost = laborCost + mobActualCost + perDiemCost;
          var margin = pr.gt - totalCost;
          var marginPct = pr.gt > 0 ? (margin / pr.gt * 100) : 0;
          var mColor = marginPct >= 40 ? "#2E7D32" : marginPct >= 25 ? "#F57F17" : "#C62828";
          var mLabel = marginPct >= 40 ? "Strong" : marginPct >= 25 ? "Acceptable" : "Low";
          return (
           <div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
             <div style={{ padding: 8, borderRadius: 6, background: "#F8F9FA", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#999" }}>Actual Labor Cost</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: BLU }}>{fmt(laborCost)}</div>
              <div style={{ fontSize: 9, color: "#AAA" }}>{pr.cd.toFixed(1)} crew-days × {fmt(CONFIG.CREW_DAY_COST)}</div>
             </div>
             <div style={{ padding: 8, borderRadius: 6, background: "#F8F9FA", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#999" }}>Mob Actual Cost</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: BLU }}>{fmt(mobActualCost)}</div>
              <div style={{ fontSize: 9, color: "#AAA" }}>{trips} trip{trips > 1 ? "s" : ""} × {fmt(Math.round(mobCostPerTrip))}/trip</div>
             </div>
             <div style={{ padding: 8, borderRadius: 6, background: "#F8F9FA", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#999" }}>Total Actual Cost</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#C62828" }}>{fmt(totalCost)}</div>
              <div style={{ fontSize: 9, color: "#AAA" }}>Labor + Travel{perDiemCost > 0 ? " + Per Diem" : ""}</div>
             </div>
            </div>
            <div style={{ padding: 10, borderRadius: 8, background: mColor === "#2E7D32" ? "#E8F5E9" : mColor === "#F57F17" ? "#FFF8E1" : "#FFEBEE", border: "1px solid " + (mColor === "#2E7D32" ? "#A5D6A7" : mColor === "#F57F17" ? "#FFE082" : "#EF9A9A") }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
               <div style={{ fontSize: 11, fontWeight: 600, color: mColor }}>{mLabel} Margin</div>
               <div style={{ fontSize: 9, color: "#777", marginTop: 1 }}>Bid {fmt(pr.gt)} − Cost {fmt(totalCost)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
               <div style={{ fontSize: 22, fontWeight: 800, color: mColor }}>{marginPct.toFixed(1)}%</div>
               <div style={{ fontSize: 12, fontWeight: 700, color: mColor }}>{fmt(margin)}</div>
              </div>
             </div>
             <div style={{ marginTop: 6, height: 6, borderRadius: 3, background: "#E0E0E0", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, background: mColor, width: Math.min(100, Math.max(0, marginPct)) + "%" }} />
             </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
             <div style={{ fontSize: 11, color: "#666" }}><strong>Duration:</strong> ~{pr.projDays} cal days</div>
             <div style={{ fontSize: 11, color: "#666" }}><strong>Crew:</strong> {pr.crews} ({pr.headcount} ppl)</div>
             <div style={{ fontSize: 11, color: "#666" }}><strong>Crew-Day Rate:</strong> {fmt(CONFIG.CREW_DAY_RATE)} (80% margin)</div>
             <div style={{ fontSize: 11, color: "#666" }}><strong>Actual Cost/Day:</strong> {fmt(CONFIG.CREW_DAY_COST)} (labor only)</div>
             <div style={{ fontSize: 11, color: "#666" }}><strong>$/Crew-Day Revenue:</strong> {fmt(pr.cd > 0 ? pr.gt / pr.cd : 0)}</div>
             <div style={{ fontSize: 11, color: "#666" }}><strong>$/Crew-Day Profit:</strong> {fmt(pr.cd > 0 ? margin / pr.cd : 0)}</div>
            </div>
            {rtMiles > 0 && (
             <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: "#F3F8FF", border: "1px solid #D0E4FF" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: ACC, marginBottom: 4 }}>Mob Breakdown (per trip)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, fontSize: 10, color: "#555" }}>
               <div>Drive time: {driveHrsPerTrip.toFixed(1)} hrs ({fmtN(rtMiles)} mi @ {CONFIG.AVG_DRIVE_SPEED} mph)</div>
               <div>Driver: {driveHrsPerTrip.toFixed(1)} hrs × ${CONFIG.DRIVER_RATE}/hr = {fmt(Math.round(driveHrsPerTrip * CONFIG.DRIVER_RATE))}</div>
               <div>Passengers: {CONFIG.PASSENGER_COUNT} × ${CONFIG.PASSENGER_RATE}/hr = {fmt(Math.round(driveHrsPerTrip * CONFIG.PASSENGER_RATE * CONFIG.PASSENGER_COUNT))}</div>
               <div>Diesel: {fmtN(rtMiles)} mi ÷ {CONFIG.TRUCK_MPG} mpg × ${CONFIG.DIESEL_PRICE.toFixed(2)} = {fmt(Math.round(mobGasPerTrip))}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, paddingTop: 4, borderTop: "1px solid #D0E4FF", fontSize: 11, fontWeight: 600 }}>
               <span style={{ color: "#555" }}>Cost: {fmt(mobActualCost)} ({trips} trips)</span>
               <span style={{ color: "#2E7D32" }}>Charge: {fmt(mobRevenue)} → Profit: {fmt(mobProfit)}</span>
              </div>
             </div>
            )}
            {pr.perDiemApplies && <div style={{ fontSize: 11, color: "#7B1FA2", marginTop: 4 }}><strong>Per Diem:</strong> {fmt(perDiemCost)} ({((perDiemCost / pr.gt) * 100).toFixed(1)}% of bid)</div>}
           </div>
          );
         })()}
        </div>
        <div style={{ background: "white", borderRadius: 12, padding: pad, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16 }}>
         <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: BLU }}>Surcharges</h3>
         <div style={{ fontSize: 10, color: "#999", marginBottom: 8 }}>Applied to interior + exterior + windows</div>
         {SURCH_LIST.map(function(s) {
          return (
           <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <input type="checkbox" checked={(surch[s.id] || 0) > 0} onChange={function(e) { sSurch(function(prev) { var n = {}; for (var k in prev) { n[k] = prev[k]; } n[s.id] = e.target.checked ? s.def : 0; return n; }); }} style={{ margin: 0 }} />
            <div style={{ flex: 1, fontSize: 11 }}><strong>{s.name}</strong> ({s.range})</div>
            {(surch[s.id] || 0) > 0 && (
             <input type="number" value={surch[s.id]} min={s.min} max={s.max}
              onChange={function(e) { sSurch(function(prev) { var n = {}; for (var k in prev) { n[k] = prev[k]; } n[s.id] = parseInt(e.target.value) || 0; return n; }); }}
              style={{ width: 44, padding: "2px 4px", border: "1px solid #DDD", borderRadius: 4, fontSize: 11, textAlign: "center" }} />
            )}
           </div>
          );
         })}
        </div>
       </div>
      </div>
      <div style={bRow}>
       <button onClick={function() { setStep(2); }} style={bSecondary}>Back</button>
       <button onClick={function() { setStep(4); if (!scope) { sScope(buildScope()); sScopeGT(pr ? pr.gt : 0); } }} style={bPrimary}>Scope of Work →</button>
      </div>
     </div>
    )}
    {step === 4 && (
     <div>
      <div style={{ background: "linear-gradient(135deg, " + BLU + ", #0D1F38)", borderRadius: 12, padding: isMobile ? 14 : 24, color: "white", marginBottom: 16 }}>
       <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
         <div style={{ fontSize: 10, opacity: 0.6 }}>ESTIMATE</div>
         <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, marginTop: 2 }}>{proj.name}</div>
         <div style={{ fontSize: 12, opacity: 0.8, marginTop: 1 }}>{proj.client} - {P[proj.bt] ? P[proj.bt].name : ""} - {fmtN(activeSF)} SF</div>
        </div>
        <div style={{ textAlign: isMobile ? "left" : "right" }}>
         <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800 }}>{fmt(pr ? pr.gt : 0)}</div>
         <div style={{ fontSize: 11, opacity: 0.7 }}>{fmtR(pr ? pr.rate : 0)}{pr && pr.winBundledPerSF > 0 ? " (+" + fmtR(pr.winBundledPerSF) + " win)" : ""}/SF + {fmt(pr ? pr.mob.total : 0)} mob{pr && pr.winTotal > 0 && pr.winSeparate ? (" + " + fmt(pr.winTotal) + " win") : ""}</div>
        </div>
       </div>
       <div style={{ display: "grid", gridTemplateColumns: "repeat(" + Math.min(sel.length + 1 + (pr && pr.st > 0 ? 1 : 0) + (pr && pr.extTotal > 0 ? 1 : 0) + (pr && pr.winPanes > 0 && pr.winSeparate ? 1 : 0) + (pr && pr.perDiemApplies ? 1 : 0), isMobile ? 3 : 8) + ", 1fr)", gap: 6, marginTop: 12 }}>
        {sel.map(function(id) {
         var s = ALL_STAGES.find(function(x) { return x.id === id; });
         return (
          <div key={id} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 6px", textAlign: "center" }}>
           <div style={{ fontSize: 9, opacity: 0.7 }}>{s.short}</div>
           <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: 700, marginTop: 1 }}>{fmt(pr ? pr.br[id] : 0)}</div>
          </div>
         );
        })}
        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 6px", textAlign: "center" }}>
         <div style={{ fontSize: 9, opacity: 0.7 }}>Mob</div>
         <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: 700, marginTop: 1 }}>{fmt(pr ? pr.mob.total : 0)}</div>
        </div>
        {pr && pr.st > 0 && (
         <div style={{ background: "rgba(230,126,34,0.3)", borderRadius: 6, padding: "8px 6px", textAlign: "center" }}>
          <div style={{ fontSize: 9, opacity: 0.7 }}>Surcharges</div>
          <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: 700, marginTop: 1 }}>+{fmt(pr.st)}</div>
         </div>
        )}
        {pr && pr.extTotal > 0 && (
         <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 6px", textAlign: "center" }}>
          <div style={{ fontSize: 9, opacity: 0.7 }}>Exterior</div>
          <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: 700, marginTop: 1 }}>{fmt(pr.extTotal)}</div>
         </div>
        )}
        {pr && pr.winPanes > 0 && pr.winSeparate && (
         <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 6, padding: "8px 6px", textAlign: "center" }}>
          <div style={{ fontSize: 9, opacity: 0.7 }}>Windows</div>
          <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: 700, marginTop: 1 }}>{fmt(pr.winTotal)}</div>
         </div>
        )}
        {pr && pr.winPanes > 0 && !pr.winSeparate && (
         <div style={{ background: "rgba(46,125,50,0.25)", borderRadius: 6, padding: "8px 6px", textAlign: "center" }}>
          <div style={{ fontSize: 9, opacity: 0.7 }}>Windows</div>
          <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, marginTop: 2 }}>Bundled</div>
         </div>
        )}
        {pr && pr.perDiemApplies && (
         <div style={{ background: "rgba(123,31,162,0.3)", borderRadius: 6, padding: "8px 6px", textAlign: "center" }}>
          <div style={{ fontSize: 9, opacity: 0.7 }}>Per Diem</div>
          <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: 700, marginTop: 1 }}>{fmt(pr.perDiemTotal)}</div>
         </div>
        )}
       </div>
      </div>
      <div style={card}>
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 15 : 18, fontWeight: 700, color: BLU }}>Scope of Work</h2>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
         <button onClick={function() { sScope(buildScope()); sScopeGT(pr ? pr.gt : 0); sScopeEdit(false); }} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid " + ACC, background: "white", fontSize: 10, cursor: "pointer", color: ACC, fontWeight: 700 }}>↻ Refresh Template</button>
         <button onClick={genScope} disabled={scopeL} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #DDD", background: "white", fontSize: 10, cursor: "pointer" }}>{scopeL ? "..." : "AI Regen"}</button>
         {scope && <button onClick={function() { sScopeEdit(!scopeEdit); }} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid " + (scopeEdit ? ACC : "#DDD"), background: scopeEdit ? LT : "white", fontSize: 10, cursor: "pointer", fontWeight: scopeEdit ? 700 : 400, color: scopeEdit ? ACC : "#555" }}>{scopeEdit ? "View" : "Edit"}</button>}
         <button onClick={function() { copyText(scope); }} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #DDD", background: "white", fontSize: 10, cursor: "pointer" }}>Copy Text</button>
         <button onClick={function() { downloadScope(false); }} disabled={!scope} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#C62828", color: "white", fontSize: 10, cursor: "pointer", fontWeight: 700, opacity: scope ? 1 : 0.5 }}>Export Scope</button>
         <button onClick={function() { emailScopeOrCO(false); }} disabled={!scope} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid " + ACC, background: "white", color: ACC, fontSize: 10, cursor: "pointer", fontWeight: 700, opacity: scope ? 1 : 0.5 }}>📧 Email Scope</button>
        </div>
       </div>
       {scopeErr && (<div style={{ marginBottom: 10, padding: "10px 14px", borderRadius: 8, background: "#FFEBEE", border: "1px solid #EF9A9A", fontSize: 12, color: "#C62828" }}><strong>Error:</strong> {scopeErr}</div>)}
       {scope && pr && Math.abs(pr.gt - scopeGT) > 1 && (<div style={{ marginBottom: 10, padding: "8px 14px", borderRadius: 8, background: "#FFF3E0", border: "1px solid #FFB74D", fontSize: 11, color: "#E65100" }}>Pricing has changed since this scope was generated. Hit <strong>↻ Refresh Template</strong> or <strong>AI Regen</strong> to update.</div>)}
       {scopeL ? (
        <div style={{ textAlign: "center", padding: 24, color: "#999" }}>
         <div style={{ fontSize: 18 }}>Writing scope...</div>
        </div>
       ) : scope ? (
        scopeEdit ? (
         <textarea value={scope} onChange={function(e) { sScope(e.target.value); }}
          style={{ width: "100%", minHeight: isMobile ? 400 : 500, maxHeight: isMobile ? 500 : 700, padding: isMobile ? 12 : 16, border: "1px solid " + ACC, borderRadius: 8, fontSize: 12, fontFamily: "monospace", lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box", background: "#FAFAFA" }} />
        ) : (
         <div style={{ maxHeight: isMobile ? 500 : 600, overflowY: "auto", padding: isMobile ? 12 : 20, background: "white", borderRadius: 8, border: "1px solid #E8E8E8" }}>
          {renderFormattedScope(scope)}
         </div>
        )
       ) : (
        <div style={{ textAlign: "center", padding: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
         <button onClick={genScope} style={bPrimary}>Generate with AI</button>
         <button onClick={function() { sScope(buildScope()); sScopeGT(pr ? pr.gt : 0); sScopeEdit(false); }} style={bSecondary}>Use Template (Instant)</button>
        </div>
       )}
      </div>
      <div style={{ background: "#FFF8E1", borderRadius: 10, padding: isMobile ? 10 : 16, marginBottom: 14, border: "1px solid #FFE082" }}>
       <div style={{ fontWeight: 700, fontSize: 13, color: "#F57F17", marginBottom: 4 }}>RFI Check</div>
       <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>
        {areas.some(function(a) { return a.floorType === "TBD"; }) && <div>TBD floor types - request finish schedule.</div>}
        {areas.some(function(a) { return !parseInt(a.sf); }) && <div>0 SF areas - verify against plans.</div>}
        {!areas.some(function(a) { return a.floorType === "TBD"; }) && !areas.some(function(a) { return !parseInt(a.sf); }) && <div>Data looks complete.</div>}
       </div>
      </div>
      {/* Multi-Tier Comparison */}
      <div style={card}>
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 15 : 18, fontWeight: 700, color: BLU }}>Tier Comparison</h2>
        <button onClick={function() { sShowComparison(!showComparison); }}
         style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #DDD", background: "white", fontSize: 10, cursor: "pointer" }}>{showComparison ? "Hide" : "Show"}</button>
       </div>
       {showComparison && pr && (
        <div style={{ overflowX: "auto" }}>
         <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: BLU }}>
           <th style={{ color: "white", padding: "7px 8px", textAlign: "left", fontSize: 10 }}>Tier</th>
           <th style={{ color: "white", padding: "7px 8px", textAlign: "right", fontSize: 10 }}>$/SF</th>
           <th style={{ color: "white", padding: "7px 8px", textAlign: "right", fontSize: 10 }}>Interior</th>
           <th style={{ color: "white", padding: "7px 8px", textAlign: "right", fontSize: 10 }}>+ Mob/Ext/Win</th>
           <th style={{ color: "white", padding: "7px 8px", textAlign: "right", fontSize: 10, fontWeight: 800 }}>Total</th>
          </tr></thead>
          <tbody>
           {pr.ar.map(function(r, i) {
            var addonTotal = pr.mob.total + pr.extTotal + (pr.winSeparate ? pr.winTotal : 0) + (pr.perDiemApplies ? pr.perDiemTotal : 0);
            var surchAmt = 0;
            var surchBaseRow = r.total + pr.extBase + (pr.winSeparate ? pr.winTotal : 0);
            Object.keys(surch).forEach(function(k) { if (surch[k] > 0) { surchAmt += surchBaseRow * (surch[k] / 100); } });
            var rowTotal = r.total + surchAmt + addonTotal;
            return (
             <tr key={i} style={{ background: i === tier ? LT : (i % 2 ? "#FAFAFA" : "white"), borderBottom: "1px solid #EEE", fontWeight: i === tier ? 700 : 400 }}>
              <td style={{ padding: "7px 8px" }}>
               <span style={{ fontSize: 12 }}>{r.tier}</span>
               {i === tier && <span style={{ marginLeft: 6, padding: "1px 5px", borderRadius: 3, background: ACC, color: "white", fontSize: 8 }}>SELECTED</span>}
              </td>
              <td style={{ padding: "7px 8px", textAlign: "right" }}>{fmtR(r.rate)}</td>
              <td style={{ padding: "7px 8px", textAlign: "right" }}>{fmt(r.total)}</td>
              <td style={{ padding: "7px 8px", textAlign: "right", color: "#777" }}>+{fmt(addonTotal + surchAmt)}</td>
              <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 800, color: i === tier ? BLU : "#333" }}>{fmt(rowTotal)}</td>
             </tr>
            );
           })}
          </tbody>
         </table>
        </div>
       )}
      </div>
      {proj.notes && (
       <div style={{ background: "#F3E5F5", borderRadius: 10, padding: isMobile ? 10 : 16, marginBottom: 14, border: "1px solid #CE93D8" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#7B1FA2", marginBottom: 4 }}>Internal Notes</div>
        <div style={{ fontSize: 12, color: "#555", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{proj.notes}</div>
       </div>
      )}
      <div style={bRow}>
       <button onClick={function() { setStep(3); }} style={bSecondary}>Pricing</button>
       <button onClick={function() {
        var sCosts = sel.map(function(id) { return ALL_STAGES.find(function(s) { return s.id === id; }).name + ": " + fmt(pr ? pr.br[id] : 0); }).join("\n");
        var surchL = (pr && pr.st > 0) ? ("\nSurcharges: +" + fmt(pr.st)) : "";
        var extL = (pr && pr.extTotal > 0) ? ("\nExterior: " + fmt(pr.extTotal)) : "";
        var winL = "";
        if (pr && pr.winPanes > 0 && pr.winSeparate) { winL = "\nExt. Windows: " + fmt(pr.winTotal) + " (" + fmtN(pr.winPanes) + " panes @ " + fmtR(pr.winRate) + ")"; }
        if (pr && pr.winPanes > 0 && !pr.winSeparate) { winL = "\nExt. Windows: Bundled as added value (" + fmtN(pr.winPanes) + " panes, +" + fmtR(pr.winBundledPerSF) + "/SF absorbed)"; }
        var pdL = (pr && pr.perDiemApplies) ? ("\nPer Diem: " + fmt(pr.perDiemTotal) + " (" + pr.crews + " crew" + (pr.crews > 1 ? "s" : "") + " / " + pr.headcount + " people × $" + pr.perDiemRate + "/day × " + pr.projDays + " days)") : "";
        var notesL = proj.notes ? ("\n\nINTERNAL NOTES:\n" + proj.notes) : "";
        var text = "ESTIMATE: " + proj.name + "\nClient: " + proj.client + "\nBuild: " + (P[proj.bt] ? P[proj.bt].name : "") + "\nSF: " + fmtN(activeSF) + (parseInt(proj.sf) > 0 && drawingSF > 0 ? " (Bid SF: " + fmtN(parseInt(proj.sf)) + ")" : "") + "\nStages: " + sel.length + "\n\nTOTAL: " + fmt(pr ? pr.gt : 0) + "\n" + sCosts + "\nMob: " + fmt(pr ? pr.mob.total : 0) + surchL + extL + winL + pdL + notesL + "\n\nBid valid 90 days.\n\n" + scope;
        copyText(text);
       }} style={{ display: "inline-block", padding: isMobile ? "10px 16px" : "11px 24px", borderRadius: 10, border: "none", background: "#27AE60", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Copy Full Estimate</button>
       <button onClick={function() { emailScopeOrCO(false); }} style={{ display: "inline-block", padding: isMobile ? "10px 16px" : "11px 24px", borderRadius: 10, border: "none", background: ACC, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>📧 Email Estimate</button>
       {!coMode && (
        <button onClick={startChangeOrder} style={{ display: "inline-block", padding: isMobile ? "10px 16px" : "11px 24px", borderRadius: 10, border: "1px solid #E65100", background: "white", color: "#E65100", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>📝 Change Order</button>
       )}
      </div>
      {/* Change Order Panel */}
      {coMode && coOriginal && pr && (function() {
       var delta = pr.gt - coOriginal.gt;
       var sign = delta >= 0 ? "+" : "";
       var deltaColor = delta > 0 ? "#2E7D32" : delta < 0 ? "#C62828" : "#777";
       return (
        <div style={{ background: "white", borderRadius: 12, padding: isMobile ? 14 : 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 16, border: "2px solid #E65100" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
           <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#E65100" }}>Change Order Active</h3>
           <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>Original locked at {fmt(coOriginal.gt)}. Edit project, then export CO.</div>
          </div>
          <button onClick={function() { sCoMode(false); sCoOriginal(null); sCoReason(""); }}
           style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #EF9A9A", background: "white", fontSize: 10, cursor: "pointer", color: "#C62828", fontWeight: 700 }}>Cancel CO</button>
         </div>
         <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#555", display: "block", marginBottom: 3 }}>CO Reason *</label>
          <input value={coReason} onChange={function(e) { sCoReason(e.target.value); }}
           style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #DDD", fontSize: 12, boxSizing: "border-box" }}
           placeholder="e.g., GC added mezzanine level, parking garage scope expanded, finish schedule changed..." />
         </div>
         <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div style={{ padding: 10, borderRadius: 8, background: "#F8F9FA", textAlign: "center" }}>
           <div style={{ fontSize: 9, color: "#999" }}>ORIGINAL</div>
           <div style={{ fontSize: 18, fontWeight: 800, color: "#999" }}>{fmt(coOriginal.gt)}</div>
           <div style={{ fontSize: 9, color: "#BBB" }}>{fmtN(coOriginal.sf)} SF · {coOriginal.tierName} · {coOriginal.stageCount} stages</div>
          </div>
          <div style={{ padding: 10, borderRadius: 8, background: "#F8F9FA", textAlign: "center" }}>
           <div style={{ fontSize: 9, color: "#999" }}>REVISED</div>
           <div style={{ fontSize: 18, fontWeight: 800, color: BLU }}>{fmt(pr.gt)}</div>
           <div style={{ fontSize: 9, color: "#BBB" }}>{fmtN(activeSF)} SF · {TIERS[tier]} · {sel.length} stages</div>
          </div>
          <div style={{ padding: 10, borderRadius: 8, background: delta > 0 ? "#E8F5E9" : delta < 0 ? "#FFEBEE" : "#F8F9FA", textAlign: "center", border: "2px solid " + deltaColor }}>
           <div style={{ fontSize: 9, color: deltaColor }}>NET CHANGE</div>
           <div style={{ fontSize: 22, fontWeight: 800, color: deltaColor }}>{sign}{fmt(Math.abs(delta))}</div>
           <div style={{ fontSize: 9, color: deltaColor }}>{delta > 0 ? "Addition" : delta < 0 ? "Deduction" : "No Change"}</div>
          </div>
         </div>
         {/* Detail changes */}
         <div style={{ fontSize: 11, color: "#555", marginBottom: 10, lineHeight: 1.6 }}>
          {activeSF !== coOriginal.sf && <div>SF: <strong>{fmtN(coOriginal.sf)} → {fmtN(activeSF)}</strong> ({activeSF > coOriginal.sf ? "+" : ""}{fmtN(activeSF - coOriginal.sf)})</div>}
          {tier !== coOriginal.tier && <div>Tier: <strong>{coOriginal.tierName} → {TIERS[tier]}</strong></div>}
          {sel.length !== coOriginal.stageCount && <div>Stages: <strong>{coOriginal.stageCount} → {sel.length}</strong></div>}
          {Math.abs(pr.mob.total - coOriginal.mob) > 1 && <div>Mob: <strong>{fmt(coOriginal.mob)} → {fmt(pr.mob.total)}</strong></div>}
          {Math.abs(pr.extTotal - coOriginal.ext) > 1 && <div>Exterior: <strong>{fmt(coOriginal.ext)} → {fmt(pr.extTotal)}</strong></div>}
          {(function() {
           var origNames = coOriginal.areas.map(function(a) { return a.name + "|" + a.floor; });
           var newNames = areas.map(function(a) { return a.name + "|" + a.floor; });
           var added = newNames.filter(function(n) { return origNames.indexOf(n) < 0; });
           var removed = origNames.filter(function(n) { return newNames.indexOf(n) < 0; });
           return (
            <span>
             {added.length > 0 && <div style={{ color: "#2E7D32" }}>+ Added: <strong>{added.map(function(a) { return a.split("|")[0]; }).join(", ")}</strong></div>}
             {removed.length > 0 && <div style={{ color: "#C62828" }}>− Removed: <strong>{removed.map(function(a) { return a.split("|")[0]; }).join(", ")}</strong></div>}
            </span>
           );
          })()}
          {activeSF === coOriginal.sf && tier === coOriginal.tier && sel.length === coOriginal.stageCount && <div style={{ color: "#999" }}>No structural changes detected. Go back and modify areas, SF, stages, or tier.</div>}
         </div>
         <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={function() { setStep(2); }}
           style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #DDD", background: "white", fontSize: 12, cursor: "pointer", color: "#555", fontWeight: 600 }}>← Edit Areas</button>
          <button onClick={function() { setStep(3); }}
           style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #DDD", background: "white", fontSize: 12, cursor: "pointer", color: "#555", fontWeight: 600 }}>← Edit Pricing</button>
          <button onClick={function() { copyText(buildChangeOrderText()); }}
           style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #E65100", background: "white", color: "#E65100", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>📋 Copy CO Text</button>
          <button onClick={function() { downloadScope(true); }}
           style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#E65100", color: "white", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>Export CO + Scope</button>
          <button onClick={function() { emailScopeOrCO(true); }}
           style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: ACC, color: "white", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>📧 Email CO + Scope</button>
         </div>
        </div>
       );
      })()}
      {/* Version History */}
      {(function() {
       try {
        var raw = localStorage.getItem("flc_est_" + proj.name);
        if (!raw) { return null; }
        var data = JSON.parse(raw);
        if (!data.versions || data.versions.length < 2) { return null; }
        var vers = data.versions.slice().reverse();
        return (
         <div style={card}>
          <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: BLU }}>Revision History</h3>
          <div style={{ fontSize: 10, color: "#999", marginBottom: 8 }}>Tracks each save — pricing tier, total, and reason.</div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
           {vers.map(function(v, vi) {
            var d = v.ts ? new Date(v.ts) : null;
            var dateStr = d ? (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
            var isCurrent = vi === 0;
            return (
             <div key={vi} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderBottom: "1px solid #F0F0F0", background: isCurrent ? LT : "white" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: isCurrent ? ACC : "#E0E0E0", color: isCurrent ? "white" : "#999", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>v{v.v}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
               <div style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? BLU : "#555" }}>
                {fmt(v.gt)} — {v.tierName || TIERS[v.tier] || "?"} — {v.stages || "?"} stage{(v.stages || 0) !== 1 ? "s" : ""} — {fmtN(v.sf || 0)} SF
               </div>
               <div style={{ fontSize: 9, color: "#AAA" }}>
                {dateStr}{isCurrent ? " (current)" : ""}{v.note ? " — " + v.note : ""}
               </div>
              </div>
             </div>
            );
           })}
          </div>
         </div>
        );
       } catch(e) { return null; }
      })()}
     </div>
    )}
   </div>
  </div>
 );
}

class FLCErrorBoundary extends React.Component {
 constructor(props) { super(props); this.state = { hasError: false, error: null }; }
 static getDerivedStateFromError(error) { return { hasError: true, error: error }; }
 render() {
  if (this.state.hasError) {
   var self = this;
   return React.createElement("div", { style: { fontFamily: "system-ui, sans-serif", padding: 40, textAlign: "center" } },
    React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "⚠️"),
    React.createElement("h2", { style: { color: "#1B3A5C", marginBottom: 8 } }, "Something went wrong"),
    React.createElement("p", { style: { color: "#777", marginBottom: 16, fontSize: 14 } }, "The estimator hit an unexpected error. Your saved projects are safe."),
    React.createElement("button", {
     onClick: function() { self.setState({ hasError: false, error: null }); },
     style: { padding: "10px 24px", borderRadius: 8, border: "none", background: "#2E75B6", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }
    }, "Reload Estimator")
   );
  }
  return this.props.children;
 }
}

export default function FLCEstimatorApp() {
 return React.createElement(FLCErrorBoundary, null, React.createElement(FLCEstimator));
}
