
declare module 'civet' {

    export const version: string;
    
    export enum PropertyType {
        String = 1,
        Number = 2,
        Binary = 4,
        Score = 5,           // a kind of score, which looks like ☆ and range is [0, 5] 
        Datetime = 6
    }

    export interface ResourceProperty {
        name: string;
        type: PropertyType;
        query: boolean;
        store: boolean;
        value: any;
    }

    export interface Category {

    }

    export interface IResource {
        id: number;
        type: string;
        name: string;
        path?: string ;
        remote?: string|null;
        tag: string[];
        category: string[];
        thumnail: ArrayBuffer;
        anno?: string[];
        keyword: string[];
        meta: ResourceProperty[];

        /**
         * @brief add a new property. If property exist, it will be changed.
         * @param prop property
         */
        putProperty(prop: ResourceProperty): void;
        /**
         * @brief get property by name. If property is not exist, return null.
         * @param name property name
         */
        getProperty(name: string): ResourceProperty|null;
        /**
         * @brief remove an exist property
         * @param name property name
         */
        removePropery(name: string): boolean;
    }

    // export class IParser {
        // pipeline?: IMessagePipeline;
    // }

    /**
     * extension context
     */
    export interface ExtensionContext {
        currentDB: string;
    }

    // export let extensionContext: ExtensionContext;
    export let activate: ((context: ExtensionContext) => any) | null;
    export let unactivate: (() => any) | null;


    export enum ViewType {
        Property = 1,
        Navigation = 2,
        Overview = 3,
        DetailView = 4,
        Search = 5
    }

    /**
     * ConditionItem is embeded into search bar, which is to update search conditions
     */
    export interface ConditionItem {
        html: string;
        conditions: Array<string|Date>;
        // onQueryChange();
    }
    export interface SearchBar {
        items: ConditionItem[];
    }

    /**
     * a control of editable label
     */
    export interface EditableLabel {
        value: string
    }

    export interface PreviewPanel {
        image: ArrayBuffer;
    }

    export interface ColorPropertyPanel {
        color: string[];            // it's value looks like #ffaabb01

        onDidColorClick(): void;
    }

    export interface CategoryPanel {}

    export interface PropertyView {
        name: string;
        preview?: ArrayBuffer;
        colorPanel?: ColorPropertyPanel;
        tags: string[];
        category?: string[];
        property: ResourceProperty[];
    }

    export interface ContentItemSelectedEvent {
        readonly items: IResource[];
    }

    export enum OverviewItemLayout {
        WaterFall = 0,
        Grid = 1,
        Row = 2,
        Custom = 3
    }

    export interface OverviewItemLoadEvent {
        resources: IResource[];
    }

    export enum ScrollType {
        None = 0,
        Horizon = 1,
        Vertical = 2
    }

    export interface OverviewVisibleRangesChangeEvent {
        view: OverView;
        scroll: ScrollType;
        percent: number;
    }
    /**
     * @brief an overview is to display all items in the center  
     */
    export interface OverView {
        html?: string;
        /**
         * if use custom layout, html is enable
         */
        layout: OverviewItemLayout;
        /**
         * @brief before loading items, dicide which item should be display
         * @param listener 
         * @param thisArg 
         */
        onResourcesLoading(listener: (e: OverviewItemLoadEvent) => void, thisArg?: any): void;

        onDidReceiveMessage(listener: (message: boolean) => void, thisArg?: any): void;
    }

    export namespace window {
        export let searchBar: SearchBar;

        export function createConditionItem(id: string): ConditionItem;

        export let propertyView: PropertyView;
        /**
         * @description after an item is selected, this event is envoked and item's property will be passed
         * @param listener a callback function after item is selected
         */
        export function onDidSelectContentItem(listener: (e: ContentItemSelectedEvent) => void, thisArg?: any): void;

        export let overView: OverView;
        export function onDidChangeOverviewVisibleRanges(listener: (e: OverviewVisibleRangesChangeEvent) => void, thisArg?: any): void;
    }

    export namespace utility {
        export const extensionPath: string;
        /**
         * @description get all classes, which likes /a/b/c
         */
        export function getClasses(): string[];
        /**
         * @description get all tags
         */
        export function getTags(): string[];
    }
}