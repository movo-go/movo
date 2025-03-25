// Import date-fns functions at the top of the file
import {
  getHours,
  eachHourOfInterval,
  differenceInMinutes,
  addMinutes,
  interval,
  startOfDay,
  addHours,
  isWithinInterval,
  addDays,
  areIntervalsOverlapping,
  eachMinuteOfInterval,
  eachDayOfInterval,
} from "date-fns";

// Define the types for our parameters and results

interface TripParameters {
  start_date: Date;
  driving_minutes: number; // Trip driving duration in minutes one way
  staying_minutes: number; // Trip stay duration in minutes
  distance_km: number; // Trip distance in kilometers one way
  is_bcaa_member: boolean; // Whether the user is a BCAA member
  vehicle_preference?:
    | "daily_drive"
    | "large_loadable"
    | "oversized"
    | undefined; // Vehicle preference
  end_is_in_evo_home_zone: boolean; // Whether the end of the trip is in the Evo home zone
  round_trip_required: boolean; // Whether a round trip is required
  is_ev?: boolean | undefined; // Whether using an electric vehicle (for Modo innovation fee)
}

interface ModoProps {
  start_date: Date;
  minutes: number;
  km: number;
  vehicle_type: "daily_drive" | "large_loadable" | "oversized";
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

interface Modo24HourCost {
  time_cost: number;
  distance_cost: number;
  day_tripper_cost: number;
  day_tripper_distance_overage_cost: number;
  day_tripper_applied: boolean;
  total: number;
  details: string[];
}

interface ComparisonResult {
  evo: CostBreakdown;
  modo_plus: CostBreakdown;
  modo_monthly: CostBreakdown;
  modo_business: CostBreakdown;
  cheapest_option: string;
  savings: number; // Savings compared to next cheapest option
  distance_km: number;
  travel_time_minutes_one_way: number;
}

const EIGHT_HOURS_IN_MINUTES = 480;
const TWELVE_HOURS_IN_MINUTES = 720;
const FULL_DAY_IN_MINUTES = 1440;

// Constants for car share rates
const EVO_RATES = {
  per_minute: 0.49,
  per_hour: 17.99,
  per_day: 104.99,
  all_access_fee: 1.85,
  bcaa_discount: 0.1, // 10%
};

const MINUTES_TO_BE_WORTH_UNLOCK_FEE =
  EVO_RATES.all_access_fee / EVO_RATES.per_minute;

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

  // Calculate time-based cost using a more intelligent approach
  let timeCost: number;

  // Calculate full days, remaining hours, and remaining minutes
  let usedMinutes: number;
  let fullDays: number;
  let remainingMinutes: number;
  let remainingHours: number;
  let finalRemainingMinutes: number;
  console.log("EVO PARAMS", params);

  let doubleUnlockFee = false;
  console.log("minutesToBeWorthUnlockFee", MINUTES_TO_BE_WORTH_UNLOCK_FEE);

  // if not in home zone you are cooked anyways
  if (!params.end_is_in_evo_home_zone) {
    usedMinutes = params.driving_minutes * 2 + params.staying_minutes;
  } else {
    if (params.round_trip_required) {
      if (params.staying_minutes > MINUTES_TO_BE_WORTH_UNLOCK_FEE) {
        usedMinutes = params.driving_minutes * 2;
        doubleUnlockFee = true;
      } else {
        usedMinutes = params.driving_minutes * 2 + params.staying_minutes;
      }
    } else {
      usedMinutes = params.driving_minutes;
    }
  }
  const roundedToNearestMinute = Math.ceil(usedMinutes);
  console.log("roundedToNearestMinute", roundedToNearestMinute);
  fullDays = Math.floor(roundedToNearestMinute / (24 * 60));
  remainingMinutes = roundedToNearestMinute % (24 * 60);
  remainingHours = Math.floor(remainingMinutes / 60);
  finalRemainingMinutes = remainingMinutes % 60;

  // Calculate costs for different rate combinations // cheapest option is always per_day -> per_hour -> per_minute
  const dayRateCost = fullDays * EVO_RATES.per_day;
  const hourRateCost = remainingHours * EVO_RATES.per_hour;
  const minuteRateCost = finalRemainingMinutes * EVO_RATES.per_minute;

  // Calculate combined cost (days + hours + minutes)
  const combinedCost = dayRateCost + hourRateCost + minuteRateCost;

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
  const fees = doubleUnlockFee
    ? EVO_RATES.all_access_fee * 2
    : EVO_RATES.all_access_fee;
  details.push(
    `All access fee: $${fees.toFixed(2)}${
      doubleUnlockFee ? " (x2, take two trips)" : ""
    }`,
  );

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
  if (usedMinutes >= EIGHT_HOURS_IN_MINUTES && fullDays < 28) {
    pvrtAmount = TAXES.pvrt * fullDays;
    const pvrtTax = pvrtAmount * TAXES.gst;
    taxAmount += pvrtTax;
    details.push(
      `PVRT: $${TAXES.pvrt.toFixed(2)} × ${fullDays} days = $${pvrtAmount.toFixed(2)}`,
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
 * Calculate the cost for Modo car share for a 24-hour period
 * @param params - The parameters for the trip
 * @param params.start_date - The start date of the 24 hour period
 * @param params.minutes - The total minutes of the trip rounded up to nearest 15 minutes
 * @param params.km - The km travelled in this 24 hour period
 * @param params.vehicle_type - The type of vehicle to use
 * @param planType - The type of plan to use
 * @returns The cost for the 24 hour period of this trip
 */
function calculateModo24HourCost(
  params: ModoProps,
  planType: "plus" | "monthly" | "business",
): Modo24HourCost {
  console.log("Piss params", params);
  if (params.minutes > 1440) {
    throw new Error("Total minutes cannot be greater than 1440");
  }

  const result: Modo24HourCost = {
    time_cost: 0,
    distance_cost: 0,
    day_tripper_cost: 0,
    day_tripper_distance_overage_cost: 0,
    day_tripper_applied: false,
    total: 0,
    details: [],
  };
  const planRates = MODO_RATES[planType];

  const vehicleType = params.vehicle_type;
  const hourlyRate = planRates[vehicleType];

  // night minutes
  let nightMinutes = 0;
  const overnightInterval = interval(
    addHours(startOfDay(new Date(params.start_date)), OVERNIGHT_START_HOUR),
    addDays(
      addHours(startOfDay(new Date(params.start_date)), OVERNIGHT_END_HOUR),
      1,
    ),
  );

  const endTime = addMinutes(params.start_date, params.minutes);
  const bookingInterval = interval(params.start_date, endTime);
  if (areIntervalsOverlapping(bookingInterval, overnightInterval)) {
    // number of minutes in the overlap
    const minutesInBookingInterval = eachMinuteOfInterval(bookingInterval);
    for (const minute of minutesInBookingInterval) {
      if (isWithinInterval(minute, overnightInterval)) {
        nightMinutes += 1;
      }
    }
    console.log("nightMinutes", nightMinutes);
  }
  const cappedNightMinutes = Math.min(nightMinutes, 180); // 3 hours
  // if booking has night minutes and has regular minutes, would need to cap both to 12 hours
  let regularMinutes = params.minutes - nightMinutes;

  const totalAppliedMinutes = regularMinutes + cappedNightMinutes;
  if (totalAppliedMinutes > TWELVE_HOURS_IN_MINUTES) {
    regularMinutes = TWELVE_HOURS_IN_MINUTES - cappedNightMinutes;
  }

  const regularCost = (regularMinutes / 60) * hourlyRate;
  result.time_cost = regularCost;
  const overnightCost = (cappedNightMinutes / 60) * hourlyRate;
  result.time_cost += overnightCost;

  result.distance_cost = params.km * MODO_RATES.per_km;

  result.total = result.time_cost + result.distance_cost;

  if (params.minutes === 1440 && vehicleType !== "oversized") {
    // check day tripper rate
    const kmIncluded = planRates.day_tripper.km_included;
    result.day_tripper_cost = planRates.day_tripper[vehicleType];
    const excessKm = params.km - kmIncluded;
    if (excessKm > 0) {
      result.day_tripper_distance_overage_cost = excessKm * MODO_RATES.per_km;
    }
    const totalDayTripperCost =
      result.day_tripper_cost + result.day_tripper_distance_overage_cost;
    if (totalDayTripperCost < result.total) {
      result.day_tripper_applied = true;
      result.total = totalDayTripperCost;
      result.details.push(`Day Tripper rate applied`);
      result.time_cost = 0;
      result.distance_cost = 0;
    }
  }
  console.log("result", result);
  return result;
}

function calculateModoCost(
  params: TripParameters,
  planType: "plus" | "monthly" | "business",
): CostBreakdown {
  console.log("Poo params", params);
  const vehicle_type = params.vehicle_preference ?? "daily_drive";
  // start_date: Date;
  // driving_minutes: number; // Trip driving duration in minutes one way
  // staying_minutes: number; // Trip stay duration in minutes
  // distance_km: number; // Trip distance in kilometers one way
  const totalMinutes = params.driving_minutes * 2 + params.staying_minutes;
  // round up to 15 minutes
  const roundedUpTo15Minutes = Math.ceil(totalMinutes / 15) * 15;
  console.log("roundedUpTo15Minutes", roundedUpTo15Minutes);
  // split into 24 hour intervals
  const endDay = addMinutes(params.start_date, roundedUpTo15Minutes);
  const daysArray = eachDayOfInterval(interval(params.start_date, endDay));
  // Start of each 24 hour interval
  const startOfEachInterval = differenceInMinutes(
    params.start_date,
    startOfDay(params.start_date),
  );
  const results: Modo24HourCost[] = [];
  for (const [index, day] of daysArray.entries()) {
    console.log("day", day);
    let km = 0;
    let minutesForDay = FULL_DAY_IN_MINUTES;

    if (index === 0) {
      km += params.distance_km;
    }
    if (index === daysArray.length - 1) {
      console.log("last day");
      km += params.distance_km;
      const minutesInDaysBeforeLastDay = index * FULL_DAY_IN_MINUTES;
      minutesForDay = roundedUpTo15Minutes - minutesInDaysBeforeLastDay;

      console.log(
        "roundedUpTo15Minutes",
        roundedUpTo15Minutes,
        index,
        minutesInDaysBeforeLastDay,
        minutesForDay,
      );
    }

    // first and last day
    const modoProps: ModoProps = {
      start_date: addMinutes(day, startOfEachInterval),
      minutes: minutesForDay,
      km,
      vehicle_type,
    };

    results.push(calculateModo24HourCost(modoProps, planType));
  }
  let subtotal = results.reduce((acc, result) => acc + result.total, 0);
  const time_cost = results.reduce((acc, result) => acc + result.time_cost, 0);
  const distance_cost = results.reduce(
    (acc, result) => acc + result.distance_cost,
    0,
  );
  const day_tripper_cost = results.reduce(
    (acc, result) =>
      result.day_tripper_applied ? acc + result.day_tripper_cost : acc,
    0,
  );
  const day_tripper_distance_overage_cost = results.reduce(
    (acc, result) =>
      result.day_tripper_applied
        ? acc + result.day_tripper_distance_overage_cost
        : acc,
    0,
  );

  const details: string[] = [];
  // add details from each result
  details.push(...results.flatMap((result) => result.details));

  // Add innovation fee
  const innovationFee = params.is_ev
    ? MODO_RATES.innovation_fee.ev
    : MODO_RATES.innovation_fee.non_ev;
  details.push(
    `Co-op innovation fee: $${innovationFee.toFixed(2)} (${params.is_ev ? "EV" : "non-EV"})`,
  );

  subtotal += innovationFee;

  let taxAmount = subtotal * (TAXES.gst + TAXES.pst);
  details.push(
    `Base taxes (GST + PST): $${(subtotal * (TAXES.gst + TAXES.pst)).toFixed(2)}`,
  );
  let pvrtAmount = 0;
  if (
    roundedUpTo15Minutes >= EIGHT_HOURS_IN_MINUTES &&
    roundedUpTo15Minutes < 28 * FULL_DAY_IN_MINUTES
  ) {
    pvrtAmount = TAXES.pvrt * daysArray.length;
    const pvrtTax = pvrtAmount * TAXES.gst;
    taxAmount += pvrtTax;
    details.push(
      `PVRT: $${TAXES.pvrt.toFixed(2)} × ${daysArray.length} days = $${pvrtAmount.toFixed(2)}`,
    );
    details.push(`GST on PVRT: $${pvrtTax.toFixed(2)}`);
  }

  return {
    time_cost: time_cost + day_tripper_cost,
    distance_cost: distance_cost + day_tripper_distance_overage_cost,
    fees: innovationFee,
    taxes: taxAmount + pvrtAmount,
    discounts: 0,
    total: subtotal + taxAmount + pvrtAmount,
    details,
  };
}

// /**
//  * Calculate the cost for Modo car share
//  */
// function calculateModoCost(
//   params: TripParameters,
//   planType: "plus" | "monthly" | "business",
// ): CostBreakdown {
//   const details: string[] = [];

//   // Select the plan rates
//   const planRates = MODO_RATES[planType];

//   // Determine vehicle type and rate
//   const vehicleType = params.vehicle_preference || "daily_drive";
//   const hourlyRate = planRates[vehicleType];
//   details.push(
//     `Vehicle type: ${vehicleType}, Hourly rate: $${hourlyRate.toFixed(2)}`,
//   );

//   // Calculate time cost with overnight and daily caps
//   let effectiveMinutes = params.driving_minutes * 2 + params.staying_minutes;

//   // Apply overnight cap if applicable (max 3 hours / 180 minutes between 6pm-9am)
//   if (params.is_overnight && params.overnight_minutes > 0) {
//     const nonOvernightMinutes =
//       params.duration_minutes - params.overnight_minutes;
//     const cappedOvernightMinutes = Math.min(180, params.overnight_minutes); // 3 hours * 60 minutes
//     effectiveMinutes = nonOvernightMinutes + cappedOvernightMinutes;
//     details.push(
//       `Overnight cap applied: ${params.overnight_minutes} overnight minutes capped to ${cappedOvernightMinutes} minutes`,
//     );
//   }

//   // Convert to hours for further calculations
//   let effectiveHours = effectiveMinutes / 60;

//   // Apply 12-hour daily cap if applicable
//   const dailyCappedHours =
//     params.days * 12 + (effectiveHours % 24 > 12 ? 12 : effectiveHours % 24);
//   effectiveHours = Math.min(effectiveHours, dailyCappedHours);
//   details.push(
//     `Effective billable hours after caps: ${effectiveHours.toFixed(2)}`,
//   );

//   // Calculate regular time cost
//   let timeCost = effectiveHours * hourlyRate;
//   details.push(
//     `Time cost: ${effectiveHours.toFixed(2)} hours × $${hourlyRate.toFixed(2)} = $${timeCost.toFixed(2)}`,
//   );

//   // Calculate regular distance cost first
//   let distanceCost = params.distance_km * MODO_RATES.per_km;
//   details.push(
//     `Distance cost (regular rate): ${params.distance_km} km × $${MODO_RATES.per_km.toFixed(2)} = $${distanceCost.toFixed(2)}`,
//   );

//   // Calculate total cost with regular hourly + distance
//   let regularTotalCost = timeCost + distanceCost;

//   // Now check if Day Tripper rate would be cheaper for whole-day bookings
//   if (effectiveMinutes >= FULL_DAY_IN_MINUTES && vehicleType !== "oversized") {
//     // 24 hours * 60 = 1440 minutes
//     const dayTripperRate = planRates.day_tripper[vehicleType];
//     const dayTripperTimeCost = params.days * dayTripperRate;

//     // Calculate included kilometers with Day Tripper
//     const includedKm = planRates.day_tripper.km_included * params.days;

//     // Calculate distance cost with Day Tripper (only pay for kilometers above included amount)
//     const extraKm = Math.max(0, params.distance_km - includedKm);
//     const dayTripperDistanceCost = extraKm * MODO_RATES.per_km;

//     // Calculate total cost with Day Tripper
//     const dayTripperTotalCost = dayTripperTimeCost + dayTripperDistanceCost;

//     // Compare costs and use Day Tripper if cheaper
//     if (dayTripperTotalCost < regularTotalCost) {
//       // Update costs
//       timeCost = dayTripperTimeCost;
//       distanceCost = dayTripperDistanceCost;

//       // Update details
//       details.push(
//         `Day Tripper rate applied: ${params.days} days × $${dayTripperRate.toFixed(2)} = $${timeCost.toFixed(2)}`,
//       );
//       details.push(`Included kilometers with Day Tripper: ${includedKm}`);

//       if (extraKm > 0) {
//         details.push(
//           `Distance cost (over included): ${extraKm} extra km × $${MODO_RATES.per_km.toFixed(2)} = $${distanceCost.toFixed(2)}`,
//         );
//       } else {
//         details.push("All kilometers included in Day Tripper rate");
//       }

//       details.push(
//         `Day Tripper total ($${dayTripperTotalCost.toFixed(2)}) is cheaper than regular rate ($${regularTotalCost.toFixed(2)})`,
//       );
//     } else {
//       details.push(
//         `Regular rate ($${regularTotalCost.toFixed(2)}) is cheaper than Day Tripper rate ($${dayTripperTotalCost.toFixed(2)})`,
//       );
//     }
//   }

//   // Add innovation fee
//   const innovationFee = params.is_ev
//     ? MODO_RATES.innovation_fee.ev
//     : MODO_RATES.innovation_fee.non_ev;
//   details.push(
//     `Co-op innovation fee: $${innovationFee.toFixed(2)} (${params.is_ev ? "EV" : "non-EV"})`,
//   );

//   // Calculate taxes
//   const baseCost = timeCost + distanceCost + innovationFee;
//   let taxAmount = baseCost * (TAXES.gst + TAXES.pst);
//   let pvrtAmount = 0;

//   // Add PVRT for trips 8+ hours (480+ minutes), except for 28+ day bookings
//   if (params.driving_minutes >= EIGHT_HOURS_IN_MINUTES && params.days < 28) {
//     pvrtAmount = TAXES.pvrt * params.days;
//     const pvrtTax = pvrtAmount * TAXES.gst;
//     taxAmount += pvrtTax;
//     details.push(
//       `PVRT: $${TAXES.pvrt.toFixed(2)} × ${params.days} days = $${pvrtAmount.toFixed(2)}`,
//     );
//     details.push(`GST on PVRT: $${pvrtTax.toFixed(2)}`);
//   }

//   details.push(
//     `Base taxes (GST + PST): $${(baseCost * (TAXES.gst + TAXES.pst)).toFixed(2)}`,
//   );

//   // Calculate total
//   const total = baseCost + taxAmount + pvrtAmount;

//   return {
//     time_cost: timeCost,
//     distance_cost: distanceCost,
//     fees: innovationFee,
//     taxes: taxAmount + pvrtAmount,
//     discounts: 0,
//     total,
//     details,
//   };
// }

/**
 * Compare all options and find the cheapest
 */
function compareCarShareOptions(params: TripParameters): ComparisonResult {
  // Calculate costs for all options
  const evoCost = calculateEvoCost(params);
  const modoPlusCost = calculateModoCost(params, "plus");
  const modoMonthlyCost = calculateModoCost(params, "monthly");
  const modoBusinessCost = calculateModoCost(params, "business");
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
  let travel_time_minutes = params.driving_minutes;

  return {
    evo: evoCost,
    modo_plus: modoPlusCost,
    modo_monthly: modoMonthlyCost,
    modo_business: modoBusinessCost,
    cheapest_option: cheapest.name,
    savings,
    distance_km: params.distance_km,
    travel_time_minutes_one_way: travel_time_minutes,
  };
}

/**
 * @deprecated Womp Womp
 * Function to convert booking parameters to required TripParameters
 */
function convertBookingToTripParameters(
  startDate: Date,
  endDate: Date,
  distance_km: number,
  is_bcaa_member: boolean,
  end_is_in_evo_home_zone: boolean,
  vehicle_preference?: "daily_drive" | "large_loadable" | "oversized",
  is_ev?: boolean,
): TripParameters {
  // Calculate duration in minutes using date-fns
  const duration_minutes = differenceInMinutes(endDate, startDate); // Convert to minutes

  // Calculate number of 24-hour periods (days)
  // const days = Math.ceil(differenceInDays(endDate, startDate));

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
  return {
    start_date: startDate,
    distance_km,
    is_bcaa_member,
    vehicle_preference,
    end_is_in_evo_home_zone,
    round_trip_required: true,
    driving_minutes: duration_minutes,
    staying_minutes: 0,
    is_ev,
  };
}

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
