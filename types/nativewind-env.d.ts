/// <reference types="nativewind/types" />

declare module "*.css" {
  const content: any;
  export default content;
}

declare module "@react-native-async-storage/async-storage";

declare module "@shopify/flash-list" {
  import { Component } from "react";
  import { FlatListProps } from "react-native";
  
  export interface FlashListProps<T> extends FlatListProps<T> {
    estimatedItemSize?: number;
  }
  
  export class FlashList<T> extends Component<FlashListProps<T>> {}
}
