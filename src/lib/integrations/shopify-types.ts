// Comprehensive Shopify Data Models
// TypeScript interfaces for all Shopify entities and API responses

// Core Shopify entities
export interface ShopifyStore {
  id: number
  name: string
  email: string
  domain: string
  province?: string
  country: string
  address1?: string
  zip?: string
  city?: string
  source?: string
  phone?: string
  latitude?: number
  longitude?: number
  primary_locale: string
  address2?: string
  created_at: string
  updated_at: string
  country_code: string
  country_name: string
  currency: string
  customer_email?: string
  timezone: string
  iana_timezone: string
  shop_owner: string
  money_format: string
  money_with_currency_format: string
  weight_unit: string
  province_code?: string
  taxes_included?: boolean
  auto_configure_tax_inclusivity?: boolean
  tax_shipping?: boolean
  county_taxes?: boolean
  plan_display_name: string
  plan_name: string
  has_discounts: boolean
  has_gift_cards: boolean
  myshopify_domain: string
  google_apps_domain?: string
  google_apps_login_enabled?: boolean
  money_in_emails_format: string
  money_with_currency_in_emails_format: string
  eligible_for_payments: boolean
  requires_extra_payments_agreement: boolean
  password_enabled: boolean
  has_storefront: boolean
  eligible_for_card_reader_giveaway: boolean
  finances: boolean
  primary_location_id: number
  cookie_consent_level: string
  visitor_tracking_consent_preference: string
  checkout_api_supported: boolean
  multi_location_enabled: boolean
  setup_required: boolean
  pre_launch_enabled: boolean
  enabled_presentment_currencies: string[]
}

export interface ShopifyProduct {
  id: number
  title: string
  body_html?: string
  vendor: string
  product_type: string
  created_at: string
  handle: string
  updated_at: string
  published_at?: string
  template_suffix?: string
  status: 'active' | 'archived' | 'draft'
  published_scope: string
  tags: string
  admin_graphql_api_id: string
  variants: ShopifyProductVariant[]
  options: ShopifyProductOption[]
  images: ShopifyProductImage[]
  image?: ShopifyProductImage
}

export interface ShopifyProductVariant {
  id: number
  product_id: number
  title: string
  price: string
  sku?: string
  position: number
  inventory_policy: 'deny' | 'continue'
  compare_at_price?: string
  fulfillment_service: string
  inventory_management?: string
  option1?: string
  option2?: string
  option3?: string
  created_at: string
  updated_at: string
  taxable: boolean
  barcode?: string
  grams: number
  image_id?: number
  weight: number
  weight_unit: string
  inventory_item_id: number
  inventory_quantity: number
  old_inventory_quantity: number
  requires_shipping: boolean
  admin_graphql_api_id: string
}

export interface ShopifyProductOption {
  id: number
  product_id: number
  name: string
  position: number
  values: string[]
}

export interface ShopifyProductImage {
  id: number
  product_id: number
  position: number
  created_at: string
  updated_at: string
  alt?: string
  width: number
  height: number
  src: string
  variant_ids: number[]
  admin_graphql_api_id: string
}

export interface ShopifyOrder {
  id: number
  admin_graphql_api_id: string
  app_id?: number
  browser_ip?: string
  buyer_accepts_marketing: boolean
  cancel_reason?: string
  cancelled_at?: string
  cart_token?: string
  checkout_id?: number
  checkout_token?: string
  client_details?: ShopifyClientDetails
  closed_at?: string
  confirmed: boolean
  contact_email?: string
  created_at: string
  currency: string
  current_subtotal_price: string
  current_subtotal_price_set: ShopifyMoneySet
  current_total_discounts: string
  current_total_discounts_set: ShopifyMoneySet
  current_total_duties_set?: ShopifyMoneySet
  current_total_price: string
  current_total_price_set: ShopifyMoneySet
  current_total_tax: string
  current_total_tax_set: ShopifyMoneySet
  customer_locale?: string
  device_id?: number
  discount_codes: ShopifyDiscountCode[]
  email: string
  estimated_taxes: boolean
  financial_status: 'pending' | 'authorized' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded' | 'voided'
  fulfillment_status?: 'fulfilled' | 'null' | 'partial' | 'restocked'
  gateway?: string
  landing_site?: string
  landing_site_ref?: string
  location_id?: number
  name: string
  note?: string
  note_attributes: ShopifyNoteAttribute[]
  number: number
  order_number: number
  order_status_url: string
  original_total_duties_set?: ShopifyMoneySet
  payment_gateway_names: string[]
  phone?: string
  presentment_currency: string
  processed_at: string
  processing_method: string
  reference?: string
  referring_site?: string
  source_identifier?: string
  source_name: string
  source_url?: string
  subtotal_price: string
  subtotal_price_set: ShopifyMoneySet
  tags: string
  tax_lines: ShopifyTaxLine[]
  taxes_included: boolean
  test: boolean
  token: string
  total_discounts: string
  total_discounts_set: ShopifyMoneySet
  total_line_items_price: string
  total_line_items_price_set: ShopifyMoneySet
  total_outstanding: string
  total_price: string
  total_price_set: ShopifyMoneySet
  total_price_usd: string
  total_shipping_price_set: ShopifyMoneySet
  total_tax: string
  total_tax_set: ShopifyMoneySet
  total_tip_received: string
  total_weight: number
  updated_at: string
  user_id?: number
  billing_address?: ShopifyAddress
  customer?: ShopifyCustomer
  discount_applications: ShopifyDiscountApplication[]
  fulfillments: ShopifyFulfillment[]
  line_items: ShopifyLineItem[]
  payment_terms?: ShopifyPaymentTerms
  refunds: ShopifyRefund[]
  shipping_address?: ShopifyAddress
  shipping_lines: ShopifyShippingLine[]
}

export interface ShopifyCustomer {
  id: number
  email: string
  accepts_marketing: boolean
  created_at: string
  updated_at: string
  first_name?: string
  last_name?: string
  orders_count: number
  state: string
  total_spent: string
  last_order_id?: number
  note?: string
  verified_email: boolean
  multipass_identifier?: string
  tax_exempt: boolean
  phone?: string
  tags: string
  last_order_name?: string
  currency: string
  accepts_marketing_updated_at: string
  marketing_opt_in_level?: string
  tax_exemptions: string[]
  admin_graphql_api_id: string
  default_address?: ShopifyAddress
  addresses: ShopifyAddress[]
}

export interface ShopifyAddress {
  id?: number
  customer_id?: number
  first_name?: string
  last_name?: string
  company?: string
  address1: string
  address2?: string
  city: string
  province?: string
  country: string
  zip: string
  phone?: string
  name?: string
  province_code?: string
  country_code: string
  country_name: string
  default?: boolean
}

// Supporting interfaces
export interface ShopifyMoneySet {
  shop_money: ShopifyMoney
  presentment_money: ShopifyMoney
}

export interface ShopifyMoney {
  amount: string
  currency_code: string
}

export interface ShopifyClientDetails {
  accept_language?: string
  browser_height?: number
  browser_ip: string
  browser_width?: number
  session_hash?: string
  user_agent?: string
}

export interface ShopifyDiscountCode {
  code: string
  amount: string
  type: 'fixed_amount' | 'percentage' | 'shipping'
}

export interface ShopifyNoteAttribute {
  name: string
  value: string
}

export interface ShopifyTaxLine {
  price: string
  rate: number
  title: string
  price_set: ShopifyMoneySet
  channel_liable: boolean
}

export interface ShopifyDiscountApplication {
  type: string
  title: string
  description?: string
  value: string
  value_type: 'fixed_amount' | 'percentage'
  allocation_method: 'across' | 'each' | 'one'
  target_selection: 'all' | 'entitled' | 'explicit'
  target_type: 'line_item' | 'shipping_line'
  code?: string
}

export interface ShopifyLineItem {
  id: number
  admin_graphql_api_id: string
  fulfillable_quantity: number
  fulfillment_service: string
  fulfillment_status?: string
  gift_card: boolean
  grams: number
  name: string
  origin_location?: ShopifyLocation
  price: string
  price_set: ShopifyMoneySet
  product_exists: boolean
  product_id?: number
  properties: ShopifyProperty[]
  quantity: number
  requires_shipping: boolean
  sku?: string
  taxable: boolean
  title: string
  total_discount: string
  total_discount_set: ShopifyMoneySet
  variant_id?: number
  variant_inventory_management?: string
  variant_title?: string
  vendor?: string
  tax_lines: ShopifyTaxLine[]
  duties: ShopifyDuty[]
  discount_allocations: ShopifyDiscountAllocation[]
}

export interface ShopifyFulfillment {
  id: number
  order_id: number
  status: 'pending' | 'open' | 'success' | 'cancelled' | 'error' | 'failure'
  created_at: string
  service: string
  updated_at: string
  tracking_company?: string
  tracking_number?: string
  tracking_numbers: string[]
  tracking_url?: string
  tracking_urls: string[]
  receipt: ShopifyFulfillmentReceipt
  name: string
  admin_graphql_api_id: string
  line_items: ShopifyLineItem[]
  location_id: number
  notify_customer: boolean
  origin_address?: ShopifyAddress
  email?: string
  destination?: ShopifyAddress
  shipment_status?: string
}

// Additional supporting interfaces
export interface ShopifyLocation {
  id: number
  name: string
  address1?: string
  address2?: string
  city?: string
  zip?: string
  province?: string
  country: string
  phone?: string
  created_at: string
  updated_at: string
  country_code: string
  country_name: string
  province_code?: string
  legacy: boolean
  active: boolean
  admin_graphql_api_id: string
}

export interface ShopifyProperty {
  name: string
  value: string
}

export interface ShopifyDuty {
  id: string
  harmonized_system_code?: string
  country_code_of_origin?: string
  shop_money: ShopifyMoney
  presentment_money: ShopifyMoney
  tax_lines: ShopifyTaxLine[]
  admin_graphql_api_id: string
}

export interface ShopifyDiscountAllocation {
  amount: string
  amount_set: ShopifyMoneySet
  discount_application_index: number
}

export interface ShopifyFulfillmentReceipt {
  testcase?: boolean
  authorization?: string
}

export interface ShopifyPaymentTerms {
  amount: number
  currency: string
  payment_terms_name: string
  payment_terms_type: string
  due_in_days: number
  payment_schedules: ShopifyPaymentSchedule[]
}

export interface ShopifyPaymentSchedule {
  amount: number
  currency: string
  issued_at?: string
  due_at?: string
  completed_at?: string
  expected_payment_method: string
}

export interface ShopifyRefund {
  id: number
  order_id: number
  created_at: string
  note?: string
  user_id?: number
  processed_at: string
  restock: boolean
  duties: ShopifyDuty[]
  admin_graphql_api_id: string
  refund_line_items: ShopifyRefundLineItem[]
  transactions: ShopifyTransaction[]
  order_adjustments: ShopifyOrderAdjustment[]
}

export interface ShopifyRefundLineItem {
  id: number
  quantity: number
  line_item_id: number
  location_id?: number
  restock_type: 'no_restock' | 'cancel' | 'return' | 'legacy_restock'
  subtotal: number
  subtotal_set: ShopifyMoneySet
  total_tax: number
  total_tax_set: ShopifyMoneySet
  line_item: ShopifyLineItem
}

export interface ShopifyTransaction {
  id: number
  order_id: number
  kind: 'authorization' | 'capture' | 'sale' | 'void' | 'refund'
  gateway: string
  status: 'pending' | 'failure' | 'success' | 'error'
  message?: string
  created_at: string
  test: boolean
  authorization?: string
  location_id?: number
  user_id?: number
  parent_id?: number
  processed_at?: string
  device_id?: number
  error_code?: string
  source_name: string
  receipt: any
  currency_exchange_adjustment?: ShopifyCurrencyExchangeAdjustment
  amount: string
  currency: string
  admin_graphql_api_id: string
}

export interface ShopifyOrderAdjustment {
  id: number
  order_id: number
  refund_id: number
  amount: string
  amount_set: ShopifyMoneySet
  kind: 'shipping_refund' | 'refund_discrepancy' | 'refund_adjustment'
  reason: string
  tax_amount: string
  tax_amount_set: ShopifyMoneySet
  admin_graphql_api_id: string
}

export interface ShopifyCurrencyExchangeAdjustment {
  id: number
  adjustment: string
  original_amount: string
  final_amount: string
  currency: string
}

export interface ShopifyShippingLine {
  id: number
  carrier_identifier?: string
  code?: string
  delivery_category?: string
  discounted_price: string
  discounted_price_set: ShopifyMoneySet
  phone?: string
  price: string
  price_set: ShopifyMoneySet
  requested_fulfillment_service_id?: string
  source: string
  title: string
  tax_lines: ShopifyTaxLine[]
  discount_allocations: ShopifyDiscountAllocation[]
}

// API Response types
export interface ShopifyApiResponse<T> {
  data?: T
  errors?: ShopifyApiError[]
}

export interface ShopifyApiError {
  message: string
  field?: string
  code?: string
}

export interface ShopifyPaginatedResponse<T> {
  data: T[]
  pageInfo: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    startCursor?: string
    endCursor?: string
  }
}

// Webhook event types
export interface ShopifyWebhookEvent {
  topic: string
  shop_domain: string
  payload: any
  webhook_id?: string
  created_at: string
}

// Rate limiting types
export interface ShopifyRateLimit {
  callLimit: number
  callsRemaining: number
  retryAfter?: number
}

export interface ShopifyGraphQLCost {
  requestedQueryCost: number
  actualQueryCost: number
  throttleStatus: {
    maximumAvailable: number
    currentlyAvailable: number
    restoreRate: number
  }
}
