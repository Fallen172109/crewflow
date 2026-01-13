// Export all custom hooks
export { useProducts } from './useProducts'
export type {
  ShopifyProduct,
  ShopifyProductImage,
  ShopifyProductVariant,
  ProductSortField,
  ProductStatusFilter,
  UseProductsOptions,
  UseProductsReturn,
} from './useProducts'

export { useOrders } from './useOrders'
export type {
  Order,
  OrderCustomer,
  OrderLineItem,
  OrderSortField,
  FulfillmentFilter,
  PaymentFilter,
  UseOrdersOptions,
  UseOrdersReturn,
} from './useOrders'
