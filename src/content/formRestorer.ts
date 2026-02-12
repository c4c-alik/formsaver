import { FormData, FormField } from './types';
import { showNotification } from './utils';

export class FormRestorer {
  /**
   * Restore form data to page
   */
  static async restoreFormData(formData: FormData): Promise<boolean> {
    try {
      // Iterate through all form fields
      for (const field of formData.formFields) {
        await this.restoreField(field);
      }

      return true;
    } catch (error) {
      console.error('Failed to restore form data:', error);
      showNotification(`Failed to restore form data: ${(error as Error).message}`, 'error');
      return false;
    }
  }

  /**
   * Restore single field
   */
  private static async restoreField(field: FormField): Promise<void> {
    // Try using primary selector
    let element = document.querySelector(field.selectors.primary) as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
      | null;

    // If primary selector fails, try alternative selectors
    if (!element && field.selectors.alternative) {
      for (const selector of field.selectors.alternative) {
        element = document.querySelector(selector) as
          | HTMLInputElement
          | HTMLSelectElement
          | HTMLTextAreaElement
          | null;
        if (element) break;
      }
    }

    // If still can't find element, try more general approach
    if (!element) {
      element = this.findElementByAttributes(field) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;
    }

    if (!element) {
      console.warn(`No matching element found: ${field.selectors.primary}`);
      return;
    }

    // Set element value
    await this.setElementValue(element, field);
  }

  /**
   * Find element by attributes
   */
  private static findElementByAttributes(field: FormField): Element | null {
    const { attributes } = field;

    // Prefer using name attribute
    if (attributes.name) {
      const element = document.querySelector(`[name="${attributes.name}"]`);
      if (element) return element;
    }

    // Use id attribute
    if (attributes.id) {
      const element = document.getElementById(attributes.id);
      if (element) return element;
    }

    // Use type and tag combination
    if (attributes.type) {
      const element = document.querySelector(`${field.type}[type="${attributes.type}"]`);
      if (element) return element;
    }

    return null;
  }

  /**
   * Set element value
   */
  private static async setElementValue(
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    field: FormField
  ): Promise<void> {
    const tagName = element.tagName.toLowerCase();

    switch (tagName) {
      case 'input':
        await this.setInputValue(element as HTMLInputElement, field);
        break;
      case 'select':
        this.setSelectValue(element as HTMLSelectElement, field);
        break;
      case 'textarea':
        (element as HTMLTextAreaElement).value = String(field.value);
        break;
    }

    // Trigger events to let page respond to changes
    this.triggerEvents(element);
  }

  /**
   * Set input value
   */
  private static async setInputValue(input: HTMLInputElement, field: FormField): Promise<void> {
    switch (input.type) {
      case 'checkbox':
      case 'radio':
        input.checked = Boolean(field.value);
        break;
      case 'file':
        // Don't restore file input
        console.warn('skip file input:', field.metadata.label || field.attributes.name);
        break;
      default:
        input.value = String(field.value);
        break;
    }
  }

  /**
   * Set select value
   */
  private static setSelectValue(select: HTMLSelectElement, field: FormField): void {
    const value = String(field.value);

    // Set value directly
    select.value = value;

    // If direct setting fails, try matching by options
    if (select.value !== value && field.options) {
      const option = field.options.find(opt => opt.value === value || opt.text === value);
      if (option) {
        select.value = option.value;
      }
    }
  }

  /**
   * Trigger necessary events
   */
  private static triggerEvents(element: HTMLElement): void {
    // Create and trigger change event
    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);

    // Create and trigger input event
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);

    // For some special elements, may need additional events
    if (element.tagName.toLowerCase() === 'select') {
      const selectEvent = new Event('select', { bubbles: true });
      element.dispatchEvent(selectEvent);
    }

    // Delay triggering blur event to simulate user operation
    setTimeout(() => {
      const blurEvent = new FocusEvent('blur', { bubbles: true });
      element.dispatchEvent(blurEvent);
    }, 100);
  }

  /**
   * Verify if form can be restored
   */
  static canRestoreForm(formData: FormData): boolean {
    // Check if page URL matches
    if (formData.url !== window.location.href) {
      console.warn('URL mismatch, current page:', window.location.href, 'saved at:', formData.url);
      return false;
    }

    // Check if there are restorable fields
    return formData.formFields.length > 0;
  }

  /**
   * Get number of restorable fields
   */
  static getRestorableFieldsCount(formData: FormData): number {
    let count = 0;

    for (const field of formData.formFields) {
      const element =
        document.querySelector(field.selectors.primary) ||
        field.selectors.alternative?.find(sel => document.querySelector(sel));

      if (element) {
        count++;
      }
    }

    return count;
  }
}
