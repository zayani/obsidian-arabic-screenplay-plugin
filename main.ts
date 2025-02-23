import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

export default class ArabicScreenplay extends Plugin {
    private debounceTimeout: NodeJS.Timeout | null = null;
    private observers: MutationObserver[] = [];

    async onload() {

        console.log('loading Arabic Screenplay plugin');

        // Debounced onChange handler
        const debouncedOnChange = this.debounce(() => this.processChanges(), 250);

        // Register events with debouncing
        this.registerEvent(
            this.app.workspace.on('layout-change', debouncedOnChange)
        );

        this.registerEvent(
            this.app.workspace.on('editor-change', debouncedOnChange)
        );

        this.registerMarkdownPostProcessor(this.handlePDFExport.bind(this));

        // Initial processing
        await this.processChanges();
    }

    private debounce(func: Function, wait: number) {
        return () => {
            if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => func(), wait);
        };
    }

    private async handlePDFExport(element: HTMLElement, context: any)   {
        console.log('PDF Export2',element,context);
        const h1Elements = element.querySelectorAll('h1');
        this.updateElementCounts(h1Elements);

        //add dir="auto" to pre elements
        // const preElements = element.querySelectorAll('pre');
        // preElements.forEach(pre => pre.setAttribute('dir', 'auto'));
    }

    private clearObservers() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }

    private async processChanges() {
        // Clear existing observers to prevent memory leaks
        this.clearObservers();

        const leaves = this.app.workspace.getLeavesOfType('markdown');

        for (const leaf of leaves) {
            const view = leaf.view as MarkdownView;
            const mode = view.getMode();

            switch (mode) {
                case 'preview':
                    this.handlePreviewMode(view);
                    break;
                case 'source':
                    this.handleSourceMode(view);
                    break;
                default:
                    console.debug(`Unsupported view mode: ${mode}`);
            }
        }
    }

    private handlePreviewMode(view: MarkdownView) {
        const previewEl = view.previewMode?.containerEl;
        if (!previewEl) return;

        const h1Elements = previewEl.querySelectorAll('.markdown-preview-view h1');
        this.updateElementCounts(h1Elements);
    }

    private handleSourceMode(view: MarkdownView) {
        const editor = view.editor;
        if (!editor) return;

        const editorEl = view.contentEl.querySelector('.cm-editor');
        if (!editorEl) return;

        const h1Spans = editorEl.querySelectorAll('.cm-header-1');
        this.updateElementCounts(h1Spans, true);
    }

    private updateElementCounts(elements: NodeListOf<Element>, withObserver = false) {
        let count = 1;

        elements.forEach(element => {
            if (element.closest('.cm-active')) return;

            const countStr = count.toString();
            element.setAttribute('data-count', countStr);

            if (withObserver) {
                const observer = new MutationObserver(mutations => {
                    mutations.forEach(mutation => {
                        if (mutation.type === 'attributes' && !element.getAttribute('data-count')) {
                            element.setAttribute('data-count', countStr);
                        }
                    });
                });

                observer.observe(element, { attributes: true });
                this.observers.push(observer);
            }

            count++;
        });
    }

    onunload() {
        // Clean up
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        this.clearObservers();
    }
}