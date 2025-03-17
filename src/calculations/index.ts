// Import date-fns functions at the top of the file
import {
  differenceInDays,
  getHours,
  eachHourOfInterval,
  differenceInMinutes,
} from "date-fns";

// Define the types for our parameters and results

interface TripParameters {
  duration_minutes: number; // Total trip duration in minutes (changed from hours)
  distance_km: number; // Total trip distance in kilometers
  is_overnight: boolean; // Whether the trip includes overnight hours (6pm-9am)
  overnight_minutes: number; // Number of minutes between 6pm-9am (changed from hours)
  days: number; // Number of 24-hour periods
  is_bcaa_member: boolean; // Whether the user is a BCAA member
  vehicle_preference?:
    | "daily_drive"
    | "large_loadable"
    | "oversized"
    | undefined; // Vehicle preference
  is_ev?: boolean | undefined; // Whether using an electric vehicle (for Modo innovation fee)
}

interface CostBreakdown {
  time_cost: number; // Cost for time/duration
  distance_cost: number; // Cost for distance
  fees: number; // Additional fees
  taxes: number; // Taxes
  discounts: number; // Applied discounts
  total: number; // Total cost
  details: string[]; // Explanation of calculations
}

interface ComparisonResult {
  evo: CostBreakdown;
  modo_plus: CostBreakdown;
  modo_monthly: CostBreakdown;
  modo_business: CostBreakdown;
  cheapest_option: string;
  savings: number; // Savings compared to next cheapest option
}

// Constants for car share rates
const EVO_RATES = {
  per_minute: 0.49,
  per_hour: 17.99,
  per_day: 104.99,
  all_access_fee: 1.85,
  bcaa_discount: 0.1, // 10%
};

const MODO_RATES = {
  plus: {
    daily_drive: 5,
    large_loadable: 7,
    oversized: 10,
    day_tripper: {
      daily_drive: 100,
      large_loadable: 135,
      km_included: 500,
    },
  },
  monthly: {
    daily_drive: 6,
    large_loadable: 8,
    oversized: 11,
    day_tripper: {
      daily_drive: 100,
      large_loadable: 135,
      km_included: 250,
    },
  },
  business: {
    daily_drive: 6,
    large_loadable: 8,
    oversized: 11,
    day_tripper: {
      daily_drive: 100,
      large_loadable: 135,
      km_included: 250,
    },
  },
  per_km: 0.35,
  innovation_fee: {
    ev: 1,
    non_ev: 3,
  },
  open_return_fee: 3,
};

const TAXES = {
  gst: 0.05,
  pst: 0.07,
  pvrt: 1.5, // Per day for trips 8+ hours
};

// Define constants for overnight time range
const OVERNIGHT_START_HOUR = 18; // 6pm
const OVERNIGHT_END_HOUR = 9; // 9am

/**
 * Calculate the cost for Evo car share
 */
function calculateEvoCost(params: TripParameters): CostBreakdown {
  const details: string[] = [];
  console.log(params);

  // Calculate time-based cost using a more intelligent approach
  let timeCost: number;

  // Calculate full days, remaining hours, and remaining minutes
  const fullDays = params.days;
  const remainingMinutes = params.duration_minutes % (24 * 60);
  const remainingHours = Math.floor(remainingMinutes / 60);
  const finalRemainingMinutes = remainingMinutes % 60;

  // Calculate costs for different rate combinations
  const dayRateCost = fullDays * EVO_RATES.per_day;
  const hourRateCost = remainingHours * EVO_RATES.per_hour;
  const minuteRateCost = finalRemainingMinutes * EVO_RATES.per_minute;

  // Calculate combined cost (days + hours + minutes)
  const combinedCost = dayRateCost + hourRateCost + minuteRateCost;
  // Find the cheapest option

  timeCost = combinedCost;

  // Add details based on the chosen pricing structure
  if (fullDays > 0) {
    details.push(
      `  - ${fullDays} full days × $${EVO_RATES.per_day.toFixed(2)} = $${dayRateCost.toFixed(2)}`,
    );
  }
  if (remainingHours > 0) {
    details.push(
      `  - ${remainingHours} hours × $${EVO_RATES.per_hour.toFixed(2)} = $${hourRateCost.toFixed(2)}`,
    );
  }
  if (finalRemainingMinutes > 0) {
    details.push(
      `  - ${finalRemainingMinutes} minutes × $${EVO_RATES.per_minute.toFixed(2)} = $${minuteRateCost.toFixed(2)}`,
    );
  }
  details.push(`  - Total time cost: $${timeCost.toFixed(2)}`);

  // Add all access fee
  const fees = EVO_RATES.all_access_fee;
  details.push(`All access fee: $${fees.toFixed(2)}`);

  // Apply BCAA discount if applicable
  let discounts = 0;
  if (params.is_bcaa_member) {
    discounts = timeCost * EVO_RATES.bcaa_discount;
    details.push(`BCAA member discount (10%): -$${discounts.toFixed(2)}`);
  }

  // Calculate taxes
  const baseCost = timeCost - discounts + fees;

  let taxAmount = baseCost * (TAXES.gst + TAXES.pst);
  let pvrtAmount = 0;

  // Add PVRT for trips 8+ hours
  if (params.duration_minutes >= 480) {
    pvrtAmount = TAXES.pvrt * params.days;
    const pvrtTax = pvrtAmount * TAXES.gst;
    taxAmount += pvrtTax;
    details.push(
      `PVRT: $${TAXES.pvrt.toFixed(2)} × ${params.days} days = $${pvrtAmount.toFixed(2)}`,
    );
    details.push(`GST on PVRT: $${pvrtTax.toFixed(2)}`);
  }

  details.push(
    `Base taxes (GST + PST): $${(baseCost * (TAXES.gst + TAXES.pst)).toFixed(2)}`,
  );

  // No distance cost for Evo
  const distanceCost = 0;

  // Calculate total
  const total = baseCost + taxAmount + pvrtAmount;
  console.log("piss", {
    timeCost,
    distanceCost,
    fees,
    taxes: taxAmount + pvrtAmount,
    discounts,
    total,
  });
  return {
    time_cost: timeCost,
    distance_cost: distanceCost,
    fees,
    taxes: taxAmount + pvrtAmount,
    discounts,
    total,
    details,
  };
}

/**
 * Calculate the cost for Modo car share
 */
function calculateModoCost(
  params: TripParameters,
  planType: "plus" | "monthly" | "business",
): CostBreakdown {
  const details: string[] = [];

  // Select the plan rates
  const planRates = MODO_RATES[planType];

  // Determine vehicle type and rate
  const vehicleType = params.vehicle_preference || "daily_drive";
  const hourlyRate = planRates[vehicleType];
  details.push(
    `Vehicle type: ${vehicleType}, Hourly rate: $${hourlyRate.toFixed(2)}`,
  );

  // Calculate time cost with overnight and daily caps
  let effectiveMinutes = params.duration_minutes;

  // Apply overnight cap if applicable (max 3 hours / 180 minutes between 6pm-9am)
  if (params.is_overnight && params.overnight_minutes > 0) {
    const nonOvernightMinutes =
      params.duration_minutes - params.overnight_minutes;
    const cappedOvernightMinutes = Math.min(180, params.overnight_minutes); // 3 hours * 60 minutes
    effectiveMinutes = nonOvernightMinutes + cappedOvernightMinutes;
    details.push(
      `Overnight cap applied: ${params.overnight_minutes} overnight minutes capped to ${cappedOvernightMinutes} minutes`,
    );
  }

  // Convert to hours for further calculations
  let effectiveHours = effectiveMinutes / 60;

  // Apply 12-hour daily cap if applicable
  const dailyCappedHours =
    params.days * 12 + (effectiveHours % 24 > 12 ? 12 : effectiveHours % 24);
  effectiveHours = Math.min(effectiveHours, dailyCappedHours);
  details.push(
    `Effective billable hours after caps: ${effectiveHours.toFixed(2)}`,
  );

  // Calculate regular time cost
  let timeCost = effectiveHours * hourlyRate;
  details.push(
    `Time cost: ${effectiveHours.toFixed(2)} hours × $${hourlyRate.toFixed(2)} = $${timeCost.toFixed(2)}`,
  );

  // Calculate regular distance cost first
  let distanceCost = params.distance_km * MODO_RATES.per_km;
  details.push(
    `Distance cost (regular rate): ${params.distance_km} km × $${MODO_RATES.per_km.toFixed(2)} = $${distanceCost.toFixed(2)}`,
  );

  // Calculate total cost with regular hourly + distance
  let regularTotalCost = timeCost + distanceCost;
  
  // Now check if Day Tripper rate would be cheaper for whole-day bookings
  if (params.duration_minutes >= 1440 && vehicleType !== "oversized") {
    // 24 hours * 60 = 1440 minutes
    const dayTripperRate = planRates.day_tripper[vehicleType];
    const dayTripperTimeCost = params.days * dayTripperRate;
    
    // Calculate included kilometers with Day Tripper
    const includedKm = planRates.day_tripper.km_included * params.days;
    
    // Calculate distance cost with Day Tripper (only pay for kilometers above included amount)
    const extraKm = Math.max(0, params.distance_km - includedKm);
    const dayTripperDistanceCost = extraKm * MODO_RATES.per_km;
    
    // Calculate total cost with Day Tripper
    const dayTripperTotalCost = dayTripperTimeCost + dayTripperDistanceCost;
    
    // Compare costs and use Day Tripper if cheaper
    if (dayTripperTotalCost < regularTotalCost) {
      // Update costs
      timeCost = dayTripperTimeCost;
      distanceCost = dayTripperDistanceCost;
      
      // Update details
      details.push(
        `Day Tripper rate applied: ${params.days} days × $${dayTripperRate.toFixed(2)} = $${timeCost.toFixed(2)}`
      );
      details.push(`Included kilometers with Day Tripper: ${includedKm}`);
      
      if (extraKm > 0) {
        details.push(
          `Distance cost (over included): ${extraKm} extra km × $${MODO_RATES.per_km.toFixed(2)} = $${distanceCost.toFixed(2)}`
        );
      } else {
        details.push("All kilometers included in Day Tripper rate");
      }
      
      details.push(`Day Tripper total ($${dayTripperTotalCost.toFixed(2)}) is cheaper than regular rate ($${regularTotalCost.toFixed(2)})`);
    } else {
      details.push(`Regular rate ($${regularTotalCost.toFixed(2)}) is cheaper than Day Tripper rate ($${dayTripperTotalCost.toFixed(2)})`);
    }
  }

  // Add innovation fee
  const innovationFee = params.is_ev
    ? MODO_RATES.innovation_fee.ev
    : MODO_RATES.innovation_fee.non_ev;
  details.push(
    `Co-op innovation fee: $${innovationFee.toFixed(2)} (${params.is_ev ? "EV" : "non-EV"})`,
  );

  // Calculate taxes
  const baseCost = timeCost + distanceCost + innovationFee;
  let taxAmount = baseCost * (TAXES.gst + TAXES.pst);
  let pvrtAmount = 0;

  // Add PVRT for trips 8+ hours (480+ minutes), except for 28+ day bookings
  if (params.duration_minutes >= 480 && params.days < 28) {
    pvrtAmount = TAXES.pvrt * params.days;
    const pvrtTax = pvrtAmount * TAXES.gst;
    taxAmount += pvrtTax;
    details.push(
      `PVRT: $${TAXES.pvrt.toFixed(2)} × ${params.days} days = $${pvrtAmount.toFixed(2)}`,
    );
    details.push(`GST on PVRT: $${pvrtTax.toFixed(2)}`);
  }

  details.push(
    `Base taxes (GST + PST): $${(baseCost * (TAXES.gst + TAXES.pst)).toFixed(2)}`,
  );

  // Calculate total
  const total = baseCost + taxAmount + pvrtAmount;

  return {
    time_cost: timeCost,
    distance_cost: distanceCost,
    fees: innovationFee,
    taxes: taxAmount + pvrtAmount,
    discounts: 0,
    total,
    details,
  };
}

/**
 * Compare all options and find the cheapest
 */
function compareCarShareOptions(params: TripParameters): ComparisonResult {
  // Calculate costs for all options
  const evoCost = calculateEvoCost(params);
  const modoPlusCost = calculateModoCost(params, "plus");
  const modoMonthlyCost = calculateModoCost(params, "monthly");
  const modoBusinessCost = calculateModoCost(params, "business");
  console.log(evoCost);
  // Find the cheapest option
  const options = [
    { name: "Evo", cost: evoCost.total },
    { name: "Modo Plus", cost: modoPlusCost.total },
    { name: "Modo Monthly", cost: modoMonthlyCost.total },
    { name: "Modo Business", cost: modoBusinessCost.total },
  ];

  // Sort by cost
  options.sort((a, b) => a.cost - b.cost);

  // Calculate savings
  const cheapest = options[0]!;
  const nextCheapest = options[1]!;
  const savings = nextCheapest.cost - cheapest.cost;

  return {
    evo: evoCost,
    modo_plus: modoPlusCost,
    modo_monthly: modoMonthlyCost,
    modo_business: modoBusinessCost,
    cheapest_option: cheapest.name,
    savings,
  };
}

// Function to convert booking parameters to required TripParameters
function convertBookingToTripParameters(
  startDate: Date,
  endDate: Date,
  distance_km: number,
  is_bcaa_member: boolean,
  vehicle_preference?: "daily_drive" | "large_loadable" | "oversized",
  is_ev?: boolean,
): TripParameters {
  // Calculate duration in minutes using date-fns
  const duration_minutes = differenceInMinutes(endDate, startDate); // Convert to minutes

  // Calculate number of 24-hour periods (days)
  const days = Math.ceil(differenceInDays(endDate, startDate));

  // Calculate overnight minutes
  let overnight_minutes = 0;

  // Get all hours in the interval
  const hours = eachHourOfInterval({ start: startDate, end: endDate });

  // Count minutes that fall within overnight hours (6pm-9am)
  for (const hour of hours) {
    const hourOfDay = getHours(hour);
    if (hourOfDay >= OVERNIGHT_START_HOUR || hourOfDay < OVERNIGHT_END_HOUR) {
      overnight_minutes += 60; // Add 60 minutes for each overnight hour
    }
  }

  const is_overnight = overnight_minutes > 0;
  console.log("balls", {
    duration_minutes,
    distance_km,
    is_overnight,
    overnight_minutes,
    days,
    is_bcaa_member,
    vehicle_preference,
    is_ev,
  });
  return {
    duration_minutes,
    distance_km,
    is_overnight,
    overnight_minutes,
    days,
    is_bcaa_member,
    vehicle_preference,
    is_ev,
  };
}

// // Example usage
// const tripParams = convertBookingToTripParameters(
//   new Date("2025-03-17T14:00:00"), // 2pm today
//   new Date("2025-03-18T10:00:00"), // 10am tomorrow
//   75, // 75 km
//   true, // BCAA member
//   "daily_drive", // Regular car
//   false, // Not an EV
// );

// const result = compareCarShareOptions(tripParams);

// console.log("Trip Parameters:");
// console.log(tripParams);
// console.log("\nComparison Result:");
// console.log(
//   `Cheapest option: ${result.cheapest_option} ($${
//     result.cheapest_option === "Evo"
//       ? result.evo.total.toFixed(2)
//       : result.cheapest_option === "Modo Plus"
//         ? result.modo_plus.total.toFixed(2)
//         : result.cheapest_option === "Modo Monthly"
//           ? result.modo_monthly.total.toFixed(2)
//           : result.modo_business.total.toFixed(2)
//   })`,
// );
// console.log(`Savings: $${result.savings.toFixed(2)}`);

// console.log("\nEvo Details:");
// result.evo.details.forEach((detail) => console.log(`- ${detail}`));

// console.log("\nModo Plus Details:");
// result.modo_plus.details.forEach((detail) => console.log(`- ${detail}`));

// Create a function to optimize multiple trips
function optimizeMultipleTrips(trips: TripParameters[]): string {
  // For multiple trips, we need to consider membership fees spread across all trips

  // First, calculate the cost of each individual trip with each service
  const tripResults = trips.map((trip) => compareCarShareOptions(trip));

  // Count how many times each service is the cheapest
  const serviceCounts = {
    Evo: 0,
    "Modo Plus": 0,
    "Modo Monthly": 0,
    "Modo Business": 0,
  };

  tripResults.forEach((result) => {
    serviceCounts[result.cheapest_option as keyof typeof serviceCounts]++;
  });

  // Calculate total costs for different membership strategies
  const totalEvoCost = trips.reduce(
    (sum, trip) => sum + calculateEvoCost(trip).total,
    0,
  );

  const totalModoPlusCost = trips.reduce(
    (sum, trip) => sum + calculateModoCost(trip, "plus").total,
    0,
  );
  // Add membership cost (amortized) for Modo Plus

  const totalModoMonthlyCost = trips.reduce(
    (sum, trip) => sum + calculateModoCost(trip, "monthly").total,
    0,
  );
  // Add monthly fee for Modo Monthly

  const totalModoBusinessCost = trips.reduce(
    (sum, trip) => sum + calculateModoCost(trip, "business").total,
    0,
  );

  // Find the best overall strategy
  const options = [
    { name: "Evo for all trips", cost: totalEvoCost },
    { name: "Modo Plus for all trips", cost: totalModoPlusCost },
    { name: "Modo Monthly for all trips", cost: totalModoMonthlyCost },
    { name: "Modo Business for all trips", cost: totalModoBusinessCost },
    // Could also consider mixed strategies here
  ];

  options.sort((a, b) => a.cost - b.cost);
  const cheapest = options[0]!;

  return `Best strategy: ${cheapest.name} (Total cost: $${cheapest.cost.toFixed(2)})`;
}

// Export functions for use in your app
export {
  calculateEvoCost,
  calculateModoCost,
  compareCarShareOptions,
  convertBookingToTripParameters,
  optimizeMultipleTrips,
  type TripParameters,
  type CostBreakdown,
  type ComparisonResult,
};
