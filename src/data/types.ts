export type CarShareRates = {
    evo: EvoRates;
    modo: ModoRates;
    comparison_notes: ComparisonNotes;
  };
  
  // Evo Types
  export type EvoRates = {
    rates: {
      per_minute: number;
      per_hour: number;
      per_day: number;
      all_access_fee: number;
    };
    fees: {
      registration: {
        regular: number;
        bcaa_members: number;
      };
      car_share_operator_fee: number;
      discounts: {
        bcaa_members: string;
      };
    };
    service_fees: {
      yvr_park_n_fly: number;
      lost_keys: number;
      replacement_card: number;
      excessive_cleaning: number;
      unauthorized_parking: string;
      unsecured_vehicle: number;
      relocation: string;
      damage_deductible: string;
      towing_impound: string;
      towing_ubc: string;
      parking_ticket: string;
      drained_battery: number;
      loss_of_use: string;
      vehicle_recovery: string;
      unauthorized_driver: number;
      late_return_evo_return: number;
      cancellation_evo_return: string;
    };
    features: {
      included: string[];
    };
    taxes: {
      note: string;
    };
  };
  
  // Modo Types
  export type ModoRates = {
    plans: {
      modo_plus: ModoMembershipPlan;
      modo_monthly: ModoMembershipPlan;
      modo_business: ModoMembershipPlan;
    };
    trip_costs: {
      coop_innovation_fee: {
        evs: number;
        non_evs: number;
      };
      per_km: number;
      fuel_surcharge: string;
    };
    special_rates: {
      open_return: {
        fee: number;
        description: string;
      };
      overnight: {
        description: string;
      };
      hourly_cap: string;
    };
    taxes: {
      gst: number;
      pst: number;
      pvrt: {
        amount: number;
        applies_to: string;
        calculation: string;
        exceptions: string;
        note: string;
      };
    };
    additional_plans: {
      modo_green: {
        description: string;
        access: string;
      };
      modo_associate: {
        description: string;
        rates: string;
        features: string[];
      };
    };
  };
  
  export type ModoMembershipPlan = {
    membership_costs: {
      share_purchase: number | string;
      admin_fee: string;
    };
    rates: {
      daily_drive: number;
      large_loadable: number;
      oversized: number;
    };
    day_tripper: {
      daily_drive: string;
      large_loadable: string;
      km_included: string;
      description: string;
      additional_km_cost: number;
      exclusions: string;
      note: string;
    };
  };
  
  export type ComparisonNotes = {
    basic_structure: string;
    membership: string;
    special_features: {
      evo: string[];
      modo: string[];
    };
    best_for: {
      evo: string[];
      modo: string[];
    };
  };
  
  // Type for calculation functions
  export type TripParameters = {
    duration_hours: number;
    distance_km: number;
    is_bcaa_member?: boolean;
    modo_plan?: 'plus' | 'monthly' | 'business';
    modo_vehicle_type?: 'daily_drive' | 'large_loadable' | 'oversized';
    is_ev?: boolean;
    overnight_hours?: number;
  };
  
  export type CostEstimate = {
    total: number;
    breakdown: {
      time_cost: number;
      distance_cost: number;
      fees: number;
      taxes: number;
      discounts: number;
    };
    notes: string[];
  };
  
  // Example function types for cost calculation
  export type CalculateEvoCost = (params: TripParameters) => CostEstimate;
  export type CalculateModoCost = (params: TripParameters) => CostEstimate;
  export type CompareCarShareCosts = (params: TripParameters) => {
    evo: CostEstimate;
    modo: CostEstimate;
    recommendation: string;
  };