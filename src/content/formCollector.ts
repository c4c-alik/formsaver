import { FormField, FormInfo, FormData } from './types';

export class FormCollector {
  /**
   * Collect all form data from current page
   */
  static collectFormData(): FormData | null {
    const forms = document.querySelectorAll('form');
    if (forms.length === 0) {
      return null;
    }

    // get first form
    const form = forms[0];
    const formFields: FormField[] = [];
    let totalFields = 0;
    let filledFields = 0;
    const fieldTypes: Record<string, number> = {};

    // collect all form elements
    const inputElements = form.querySelectorAll('input, select, textarea');

    inputElements.forEach((element: Element) => {
      const field = this.processElement(element);
      if (field) {
        formFields.push(field);
        totalFields++;

        // analyze field type
        const fieldType = field.type;
        fieldTypes[fieldType] = (fieldTypes[fieldType] || 0) + 1;

        // Check if field is filled
        if (this.isFieldFilled(field)) {
          filledFields++;
        }
      }
    });

    const formInfo: FormInfo = {
      totalFields,
      filledFields,
      fieldTypes,
    };

    return {
      id: this.generateFormId(),
      name: this.getFormName(form) || document.title,
      url: window.location.href,
      savedAt: new Date().toISOString(),
      formFields,
      formInfo,
    };
  }

  /**
   * Process single form element
   */
  private static processElement(element: Element): FormField | null {
    const tagName = element.tagName.toLowerCase();
    const inputElement = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    // Skip hidden fields and buttons
    if (
      inputElement.type === 'hidden' ||
      inputElement.type === 'submit' ||
      inputElement.type === 'button' ||
      inputElement.type === 'reset'
    ) {
      return null;
    }

    let value: string | boolean | number = '';
    let options: Array<{ value: string; text: string; selected: boolean }> | undefined;

    // Get value and options
    switch (tagName) {
      case 'input': {
        const input = element as HTMLInputElement;
        if (input.type === 'checkbox' || input.type === 'radio') {
          value = input.checked;
        } else {
          value = input.value;
        }
        break;
      }
      case 'select': {
        const select = element as HTMLSelectElement;
        value = select.value;
        options = Array.from(select.options).map(option => ({
          value: option.value,
          text: option.text,
          selected: option.selected,
        }));
        break;
      }
      case 'textarea':
        value = (element as HTMLTextAreaElement).value;
        break;
      default:
        return null;
    }

    // Generate selectors
    const selectors = this.generateSelectors(element);

    // Get label text
    const label = this.findLabel(element);

    return {
      type: inputElement.type || tagName,
      value,
      attributes: {
        type: inputElement.type,
        name: inputElement.name,
        id: inputElement.id,
      },
      metadata: {
        label,
        placeholder: (inputElement as HTMLInputElement | HTMLTextAreaElement).placeholder,
      },
      selectors,
      ...(options && { options }),
    };
  }

  /**
   * Generate CSS selectors
   */
  private static generateSelectors(element: Element): { primary: string; alternative?: string[] } {
    const selectors: string[] = [];

    // ID selector
    if (element.id) {
      selectors.push(`#${element.id}`);
    }

    // Name attribute selector
    const name = (element as HTMLInputElement).name;
    if (name) {
      selectors.push(`${element.tagName.toLowerCase()}[name='${name}']`);
    }

    // Class name selector
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        selectors.push(`${element.tagName.toLowerCase()}.${classes.join('.')}`);
      }
    }

    // Parent path selector
    const parentSelector = this.getParentPathSelector(element);
    if (parentSelector) {
      selectors.push(parentSelector);
    }

    return {
      primary: selectors[0] || element.tagName.toLowerCase(),
      alternative: selectors.slice(1),
    };
  }

  /**
   * Get parent path selector
   */
  private static getParentPathSelector(element: Element): string | null {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body) {
      const tagName = current.tagName.toLowerCase();
      let selector = tagName;

      if (current.id) {
        selector = `#${current.id}`;
      } else if ((current as HTMLInputElement).name) {
        selector = `${tagName}[name='${(current as HTMLInputElement).name}']`;
      }

      path.unshift(selector);
      current = current.parentElement;

      // Limit path length
      if (path.length > 3) break;
    }

    return path.length > 1 ? path.join(' > ') : null;
  }

  /**
   * Find associated label
   */
  private static findLabel(element: Element): string | undefined {
    const input = element as HTMLInputElement;

    // Find by for attribute
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) {
        return label.textContent?.trim() || undefined;
      }
    }

    // Find by parent
    const parent = element.parentElement;
    if (parent && parent.tagName.toLowerCase() === 'label') {
      return parent.textContent?.trim() || undefined;
    }

    // Find by adjacent element
    const prevSibling = element.previousElementSibling;
    if (prevSibling && prevSibling.tagName.toLowerCase() === 'label') {
      return prevSibling.textContent?.trim() || undefined;
    }

    return undefined;
  }

  /**
   * Check if field is filled
   */
  private static isFieldFilled(field: FormField): boolean {
    if (field.type === 'checkbox' || field.type === 'radio') {
      return Boolean(field.value);
    }
    return String(field.value).trim().length > 0;
  }

  /**
   * Get form name
   */
  private static getFormName(form: HTMLFormElement): string | null {
    // Try to get from form attributes
    if (form.name) return form.name;
    if (form.id) return form.id;

    // Try to get from title or other elements
    const title = form.querySelector('h1, h2, h3, legend');
    if (title) return title.textContent?.trim() || null;

    return null;
  }

  /**
   * Generate form ID
   */
  private static generateFormId(): string {
    return 'form_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
