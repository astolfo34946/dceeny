import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'ar'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export function normalizeLanguage(input: string | undefined | null): Language {
  const value = (input || '').toLowerCase();
  if (value.startsWith('fr')) return 'fr';
  if (value.startsWith('ar')) return 'ar';
  return 'en';
}

function setDocumentDirection(lang: Language) {
  if (typeof document === 'undefined') return;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
}

const resources = {
  en: {
    translation: {
      // Generic
      brand_name: 'DCEENY Interior Design Studio',

      // Language labels
      language_en: 'English',
      language_fr: 'Français',
      language_ar: 'العربية',

      // Landing
      landing_title: 'DCEENY Interior Design Studio',
      landing_subtitle: 'Sign in to access your invoices and 360° project walkthroughs.',
      landing_sign_in: 'Sign in',
      landing_create_account: 'Create account',

      // Auth – shared
      auth_email_label: 'Email',
      auth_password_label: 'Password',
      auth_full_name_label: 'Full name',
      auth_new_client: 'New client?',
      auth_create_account_link: 'Create account',
      auth_already_have_account: 'Already have an account?',
      auth_sign_in_link: 'Sign in',

      // Login
      login_title: 'DCEENY Interior Design Studio',
      login_subtitle: 'Sign in to your account',
      login_error_invalid_credentials: 'Invalid email or password. Please try again.',
      login_submit_default: 'Sign in',
      login_submit_loading: 'Signing in…',

      // Forgot password
      forgot_password_link: 'Forgot Password?',
      forgot_password_title: 'Reset Password',
      forgot_password_description: 'Enter your email address and we will send a password reset link.',
      forgot_password_send_button: 'Send Reset Link',
      forgot_password_sending: 'Sending…',
      forgot_password_back_login: 'Back to Login',
      forgot_password_success_title: 'Reset email sent.',
      forgot_password_success_description: 'Check your inbox and follow the instructions to create a new password.',
      forgot_password_return_login: 'Return to Login',
      forgot_password_error_invalid_email: 'Please enter a valid email address.',
      forgot_password_error_user_not_found: 'No account found with this email.',
      forgot_password_error_network: 'Network error. Please try again.',
      forgot_password_error_generic: 'Something went wrong. Please try again.',

      // Signup
      signup_title: 'DCEENY Interior Design Studio',
      signup_subtitle: 'Create your client account',
      signup_error_generic: 'Unable to create account. Please check your details.',
      signup_error_email_in_use: 'This email is already registered. Please sign in.',
      signup_submit_default: 'Create account',
      signup_submit_loading: 'Creating…',

      // Header / navigation
      header_aria_back: 'Back',
      header_aria_home: 'Home',
      header_aria_settings: 'Settings',
      header_aria_logout: 'Logout',

      // Admin layout nav
      admin_nav_dashboard: 'Dashboard',
      admin_nav_projects: 'Projects & Scenes',
      admin_nav_customers: 'Customers & Factor',

      // Customer dashboard cards
      dashboard_welcome: 'Welcome',
      dashboard_welcome_name: 'Welcome back, {{name}}',
      dashboard_admin_subtitle: 'Manage invoices and weekly 360° progress for your projects.',
      dashboard_customer_subtitle: 'Access your factor and explore your project in 360°',
      dashboard_choose_section: 'Choose a section',
      dashboard_factor_title: 'Factor',
      dashboard_factor_subtitle_admin: 'Manage invoices',
      dashboard_factor_subtitle_customer: 'View your invoices',
      dashboard_360_title: 'DCEENY 360',
      dashboard_360_locked_subtitle: '360° view not available yet',
      dashboard_360_subtitle_admin: 'Manage weekly progress',
      dashboard_360_subtitle_customer: 'View 360° progress',

      // Info cards
      info_project_progress_title: 'Project Progress',
      info_project_progress_text: 'Track weekly interior design updates in 360°.',
      info_clear_billing_title: 'Clear Billing',
      info_clear_billing_text: 'All purchases and payments in one place.',
      info_controlled_access_title: 'Controlled Access',
      info_controlled_access_text: 'Premium 360° views available on request.',

      // Admin dashboard
      admin_dashboard_welcome: 'Welcome, {{name}}',
      admin_dashboard_title: 'Dashboard',
      admin_dashboard_subtitle: 'Manage customers, Factor, and 360° projects.',
      admin_dashboard_customers_factor_label: 'Customers & Factor',
      admin_dashboard_customers_factor_helper: 'Invoices and payments',
      admin_dashboard_projects_label: 'Projects & DCEENY 360',
      admin_dashboard_projects_helper: 'Assign customer, weeks and scenes',

      // Factor – shared
      factor_total_purchases: 'Total Purchases',
      factor_total_paid: 'Total Paid',
      factor_balance: 'Balance',
      factor_purchases: 'Purchases',
      factor_payments: 'Payments',
      factor_table_date: 'Date',
      factor_table_description: 'Description',
      factor_table_amount: 'Amount (DA)',
      factor_table_method: 'Method',
      factor_table_note: 'Note',
      factor_empty_purchases: 'No purchases yet.',
      factor_empty_payments: 'No payments yet.',

      // Factor – admin
      factor_admin_title: 'Factor',
      factor_admin_subtitle: 'Purchases and payments for this customer.',
      factor_admin_add_purchase: '+ Add Purchase',
      factor_admin_add_payment: '+ Add Payment',
      factor_admin_modal_edit_purchase: 'Edit Purchase',
      factor_admin_modal_add_purchase: 'Add Purchase',
      factor_admin_modal_edit_payment: 'Edit Payment',
      factor_admin_modal_add_payment: 'Add Payment',
      factor_delete_purchase_confirm: 'Delete this purchase?',
      factor_delete_payment_confirm: 'Delete this payment?',

      // Factor – customer
      customer_factor_title: 'Your Factor',
      customer_factor_subtitle: 'Contact us for any changes.',

      // Common actions / labels
      common_save: 'Save',
      common_saving: 'Saving…',
      common_cancel: 'Cancel',
      common_delete: 'Delete',
      common_edit: 'Edit',
      common_actions: 'Actions',
      common_description_placeholder: 'Description',
      common_project: 'Project',
      common_room: 'Room',
      common_fullscreen: 'Full screen',
      common_exit_fullscreen: 'Exit full screen',
      factor_payment_method_placeholder: 'e.g. Bank transfer, Cash',
      factor_payment_note_placeholder: 'Optional',

      // 360 (customer)
      customer_360_weeks_title: 'Weekly progress',
      customer_360_weeks_subtitle: 'Select a week to view 360° scenes.',
      customer_360_weeks_empty: 'No weeks available yet.',
      customer_360_week_label: 'Week {{number}}',
      customer_360_rooms_count_one: '{{count}} room',
      customer_360_rooms_count_other: '{{count}} rooms',
      customer_360_open_week: 'Open week',
      customer_360_overview_weeks: 'Weeks captured',
      customer_360_overview_rooms: 'Rooms captured',
      customer_360_overview_last_update: 'Last update',
      customer_360_week_latest_badge: 'Latest',

      customer_360_viewer_back: 'Back to weeks',
      customer_360_rooms_title: 'Rooms',
      customer_360_rooms_subtitle: 'Click a room to view it in 360°',
      customer_360_no_scenes_title: 'No 360° scenes in this week yet',
      customer_360_no_scenes_subtitle: 'New rooms will appear here once they’re added.',

      // Admin projects / 360 management
      admin_projects_title: 'Projects',
      admin_projects_subtitle: 'Assign customers and unlock 360° view per project.',
      admin_projects_create_title_label: 'Project name',
      admin_projects_create_address_label: 'Address',
      admin_projects_create_button: 'Add project',
      admin_projects_table_name: 'Name',
      admin_projects_table_address: 'Address',
      admin_projects_table_customer: 'Customer',
      admin_projects_table_unlock_360: 'Unlock 360',
      admin_projects_not_assigned: 'Not assigned',
      admin_projects_weeks_link: 'Weeks',
      admin_projects_delete: 'Delete',
      admin_projects_empty: 'No projects yet. Create one above.',
      admin_projects_delete_confirm: 'Delete this project and all its weeks?',

      // Admin customers
      admin_customers_title: 'Customers',
      admin_customers_subtitle: "Open a client's invoice to manage purchases and payments.",
      admin_customers_table_name: 'Name',
      admin_customers_table_email: 'Email',
      admin_customers_empty: 'No customers yet. Clients will appear here after they sign up.',
      admin_customers_open_factor_aria: 'Open invoice',

      // Admin weeks/scenes
      admin_project_weeks_back: 'Projects',
      admin_project_weeks_title_suffix: 'Weeks & Scenes',
      admin_project_weeks_add_week_title: 'Add week',
      admin_project_weeks_week_number: 'Week number',
      admin_project_weeks_week_title_label: 'Title (e.g. Week 4 – Flooring)',
      admin_project_weeks_week_title_placeholder: 'Week 4 – Flooring',
      admin_project_weeks_create_week: 'Create week',
      admin_project_weeks_uploading: 'Uploading… {{progress}}%',
      admin_project_weeks_uploading_label: 'Uploading…',
      admin_project_weeks_section_title: 'Scenes & Hotspots',
      admin_project_weeks_section_help:
        'Upload 360° photos per week, then click "Edit hotspots" to add navigation points between rooms.',
      admin_project_weeks_empty:
        'No weeks yet. Create one above, then add 360° scenes and hotspots.',
      admin_project_weeks_add_360_photo: 'Add 360 photo:',
      admin_project_weeks_room_name_placeholder: 'Room name',
      admin_project_weeks_delete_week: 'Delete week',
      admin_project_weeks_delete_week_confirm: 'Delete this week and all its scenes?',
      admin_project_weeks_no_scenes_in_week: 'No scenes in this week. Upload a 360° JPG above.',
      admin_project_weeks_hotspots_count_one: '{{count}} hotspot',
      admin_project_weeks_hotspots_count_other: '{{count}} hotspots',
      admin_project_weeks_edit_hotspots: 'Edit hotspots',
      admin_project_weeks_remove: 'Remove',
      admin_project_weeks_remove_scene_confirm: 'Remove this scene from the week?',
      admin_project_weeks_set_main: 'Set as main',
      admin_project_weeks_main_label: 'Main scene',

      // 360 viewer/editor components
      viewer_unavailable: '360° viewer is not available in this environment.',
      viewer_scene_failed_title: 'Scene failed to load',
      viewer_failed_to_load_scene_fallback: 'Failed to load scene',
      readonly_loading_scene: 'Loading 360° scene',

      hotspot_editor_title: 'Edit hotspots · {{room}}',
      hotspot_editor_help:
        'Click in the 360° image to add a hotspot. Drag to move. Choose type and target room below, then Save.',
      hotspot_editor_save: 'Save hotspots',
      hotspot_editor_empty: 'No hotspots. Click on the 360° image to add one.',
      hotspot_type_circle: 'Circle',
      hotspot_type_arrow: 'Arrow',
      hotspot_direction_forward: 'Forward',
      hotspot_direction_left: 'Left',
      hotspot_direction_right: 'Right',
      hotspot_direction_back: 'Back',
      hotspot_arrow_direction_clock: 'Direction (clock 1–12)',
      hotspot_clock_oclock: "o'clock",

      editor_hotspots_title: 'Hotspots',
      editor_hotspots_help:
        'Click in the 360° image to add a point. Drag circles to fine‑tune, then choose type and target room below.',
      editor_hotspots_empty:
        'No hotspots yet. Click on the 360° image to create a navigation hotspot.',
      editor_save_hotspots: 'Save hotspots',
      editor_arrow_forward: 'Arrow forward',
      editor_arrow_left: 'Arrow left',
      editor_arrow_right: 'Arrow right',
      editor_arrow_back: 'Arrow back',
    },
  },
  fr: {
    translation: {
      brand_name: 'DCEENY Interior Design Studio',

      language_en: 'English',
      language_fr: 'Français',
      language_ar: 'العربية',

      landing_title: 'DCEENY Interior Design Studio',
      landing_subtitle: 'Connectez-vous pour accéder à vos factures et visites 360°.',
      landing_sign_in: 'Se connecter',
      landing_create_account: 'Créer un compte',

      auth_email_label: 'E-mail',
      auth_password_label: 'Mot de passe',
      auth_full_name_label: 'Nom complet',
      auth_new_client: 'Nouveau client ?',
      auth_create_account_link: 'Créer un compte',
      auth_already_have_account: 'Vous avez déjà un compte ?',
      auth_sign_in_link: 'Se connecter',

      login_title: 'DCEENY Interior Design Studio',
      login_subtitle: 'Connectez-vous à votre compte',
      login_error_invalid_credentials: 'E-mail ou mot de passe invalide. Veuillez réessayer.',
      login_submit_default: 'Se connecter',
      login_submit_loading: 'Connexion…',

      forgot_password_link: 'Mot de passe oublié ?',
      forgot_password_title: 'Réinitialiser le mot de passe',
      forgot_password_description: 'Entrez votre adresse e-mail et nous vous enverrons un lien de réinitialisation.',
      forgot_password_send_button: 'Envoyer le lien',
      forgot_password_sending: 'Envoi…',
      forgot_password_back_login: 'Retour à la connexion',
      forgot_password_success_title: 'E-mail envoyé.',
      forgot_password_success_description: 'Vérifiez votre boîte mail et suivez les instructions pour créer un nouveau mot de passe.',
      forgot_password_return_login: 'Retour à la connexion',
      forgot_password_error_invalid_email: 'Veuillez entrer une adresse e-mail valide.',
      forgot_password_error_user_not_found: 'Aucun compte avec cet e-mail.',
      forgot_password_error_network: 'Erreur réseau. Veuillez réessayer.',
      forgot_password_error_generic: 'Une erreur est survenue. Veuillez réessayer.',

      signup_title: 'DCEENY Interior Design Studio',
      signup_subtitle: 'Créez votre compte client',
      signup_error_generic: 'Impossible de créer le compte. Vérifiez vos informations.',
      signup_error_email_in_use: 'Cet e-mail est déjà utilisé. Veuillez vous connecter.',
      signup_submit_default: 'Créer un compte',
      signup_submit_loading: 'Création…',

      header_aria_back: 'Retour',
      header_aria_home: 'Accueil',
      header_aria_settings: 'Paramètres',
      header_aria_logout: 'Déconnexion',

      admin_nav_dashboard: 'Tableau de bord',
      admin_nav_projects: 'Projets & Scènes',
      admin_nav_customers: 'Clients & Factor',

      dashboard_welcome: 'Bienvenue',
      dashboard_welcome_name: 'Bon retour, {{name}}',
      dashboard_admin_subtitle: 'Gérez les factures et le suivi hebdomadaire 360° de vos projets.',
      dashboard_customer_subtitle: 'Accédez à votre factor et explorez votre projet en 360°.',
      dashboard_choose_section: 'Choisissez une section',
      dashboard_factor_title: 'Factor',
      dashboard_factor_subtitle_admin: 'Gérer les factures',
      dashboard_factor_subtitle_customer: 'Voir vos factures',
      dashboard_360_title: 'DCEENY 360',
      dashboard_360_locked_subtitle: 'Vue 360° pas encore disponible',
      dashboard_360_subtitle_admin: 'Gérer le suivi hebdomadaire',
      dashboard_360_subtitle_customer: 'Voir l’avancement 360°',

      info_project_progress_title: 'Suivi de projet',
      info_project_progress_text: 'Suivez les mises à jour hebdomadaires en 360°.',
      info_clear_billing_title: 'Facturation claire',
      info_clear_billing_text: 'Tous vos achats et paiements au même endroit.',
      info_controlled_access_title: 'Accès contrôlé',
      info_controlled_access_text: 'Vues 360° premium disponibles sur demande.',

      admin_dashboard_welcome: 'Bienvenue, {{name}}',
      admin_dashboard_title: 'Tableau de bord',
      admin_dashboard_subtitle: 'Gérez les clients, le Factor et les projets 360°.',
      admin_dashboard_customers_factor_label: 'Clients & Factor',
      admin_dashboard_customers_factor_helper: 'Factures et paiements',
      admin_dashboard_projects_label: 'Projets & DCEENY 360',
      admin_dashboard_projects_helper: 'Attribuer client, semaines et scènes',

      factor_total_purchases: 'Total achats',
      factor_total_paid: 'Total payé',
      factor_balance: 'Solde',
      factor_purchases: 'Achats',
      factor_payments: 'Paiements',
      factor_table_date: 'Date',
      factor_table_description: 'Description',
      factor_table_amount: 'Montant (DA)',
      factor_table_method: 'Méthode',
      factor_table_note: 'Note',
      factor_empty_purchases: 'Aucun achat pour le moment.',
      factor_empty_payments: 'Aucun paiement pour le moment.',

      factor_admin_title: 'Factor',
      factor_admin_subtitle: 'Achats et paiements pour ce client.',
      factor_admin_add_purchase: '+ Ajouter un achat',
      factor_admin_add_payment: '+ Ajouter un paiement',
      factor_admin_modal_edit_purchase: 'Modifier l’achat',
      factor_admin_modal_add_purchase: 'Ajouter un achat',
      factor_admin_modal_edit_payment: 'Modifier le paiement',
      factor_admin_modal_add_payment: 'Ajouter un paiement',
      factor_delete_purchase_confirm: 'Supprimer cet achat ?',
      factor_delete_payment_confirm: 'Supprimer ce paiement ?',

      customer_factor_title: 'Votre Factor',
      customer_factor_subtitle: 'Contactez-nous pour toute modification.',

      common_save: 'Enregistrer',
      common_saving: 'Enregistrement…',
      common_cancel: 'Annuler',
      common_delete: 'Supprimer',
      common_edit: 'Modifier',
      common_actions: 'Actions',
      common_description_placeholder: 'Description',
      common_project: 'Projet',
      common_room: 'Pièce',
      common_fullscreen: 'Plein écran',
      common_exit_fullscreen: 'Quitter le plein écran',
      factor_payment_method_placeholder: 'ex. Virement bancaire, Espèces',
      factor_payment_note_placeholder: 'Optionnel',

      customer_360_weeks_title: 'Suivi hebdomadaire',
      customer_360_weeks_subtitle: 'Sélectionnez une semaine pour voir les scènes 360°.',
      customer_360_weeks_empty: 'Aucune semaine disponible pour le moment.',
      customer_360_week_label: 'Semaine {{number}}',
      customer_360_rooms_count_one: '{{count}} pièce',
      customer_360_rooms_count_other: '{{count}} pièces',
      customer_360_open_week: 'Ouvrir la semaine',
      customer_360_overview_weeks: 'Semaines capturées',
      customer_360_overview_rooms: 'Pièces capturées',
      customer_360_overview_last_update: 'Dernière mise à jour',
      customer_360_week_latest_badge: 'Dernière',

      customer_360_viewer_back: 'Retour aux semaines',
      customer_360_rooms_title: 'Pièces',
      customer_360_rooms_subtitle: 'Cliquez sur une pièce pour l’afficher en 360°',
      customer_360_no_scenes_title: 'Aucune scène 360° pour cette semaine',
      customer_360_no_scenes_subtitle: 'Les nouvelles pièces apparaîtront ici une fois ajoutées.',

      admin_projects_title: 'Projets',
      admin_projects_subtitle: 'Assignez des clients et débloquez la vue 360° par projet.',
      admin_projects_create_title_label: 'Nom du projet',
      admin_projects_create_address_label: 'Adresse',
      admin_projects_create_button: 'Ajouter le projet',
      admin_projects_table_name: 'Nom',
      admin_projects_table_address: 'Adresse',
      admin_projects_table_customer: 'Client',
      admin_projects_table_unlock_360: 'Débloquer 360',
      admin_projects_not_assigned: 'Non assigné',
      admin_projects_weeks_link: 'Semaines',
      admin_projects_delete: 'Supprimer',
      admin_projects_empty: 'Aucun projet. Créez-en un ci-dessus.',
      admin_projects_delete_confirm: 'Supprimer ce projet et toutes ses semaines ?',

      admin_customers_title: 'Clients',
      admin_customers_subtitle: 'Ouvrez la facture d’un client pour gérer les achats et paiements.',
      admin_customers_table_name: 'Nom',
      admin_customers_table_email: 'E-mail',
      admin_customers_empty: 'Aucun client. Ils apparaîtront ici après inscription.',
      admin_customers_open_factor_aria: 'Ouvrir la facture',

      admin_project_weeks_back: 'Projets',
      admin_project_weeks_title_suffix: 'Semaines & Scènes',
      admin_project_weeks_add_week_title: 'Ajouter une semaine',
      admin_project_weeks_week_number: 'Numéro de semaine',
      admin_project_weeks_week_title_label: 'Titre (ex. Semaine 4 – Sol)',
      admin_project_weeks_week_title_placeholder: 'Semaine 4 – Sol',
      admin_project_weeks_create_week: 'Créer la semaine',
      admin_project_weeks_uploading: 'Téléversement… {{progress}}%',
      admin_project_weeks_uploading_label: 'Téléversement…',
      admin_project_weeks_section_title: 'Scènes & Hotspots',
      admin_project_weeks_section_help:
        'Téléversez des photos 360° par semaine, puis cliquez sur "Modifier les hotspots" pour ajouter des points de navigation entre les pièces.',
      admin_project_weeks_empty:
        'Aucune semaine. Créez-en une ci-dessus, puis ajoutez des scènes 360° et des hotspots.',
      admin_project_weeks_add_360_photo: 'Ajouter une photo 360 :',
      admin_project_weeks_room_name_placeholder: 'Nom de la pièce',
      admin_project_weeks_delete_week: 'Supprimer la semaine',
      admin_project_weeks_delete_week_confirm: 'Supprimer cette semaine et toutes ses scènes ?',
      admin_project_weeks_no_scenes_in_week: 'Aucune scène. Téléversez un JPG 360° ci-dessus.',
      admin_project_weeks_hotspots_count_one: '{{count}} hotspot',
      admin_project_weeks_hotspots_count_other: '{{count}} hotspots',
      admin_project_weeks_edit_hotspots: 'Modifier les hotspots',
      admin_project_weeks_remove: 'Retirer',
      admin_project_weeks_remove_scene_confirm: 'Retirer cette scène de la semaine ?',
      admin_project_weeks_set_main: 'Définir comme principale',
      admin_project_weeks_main_label: 'Scène principale',

      viewer_unavailable: 'Le lecteur 360° n’est pas disponible dans cet environnement.',
      viewer_scene_failed_title: 'Échec du chargement de la scène',
      viewer_failed_to_load_scene_fallback: 'Impossible de charger la scène',
      readonly_loading_scene: 'Chargement de la scène 360°',

      hotspot_editor_title: 'Modifier les hotspots · {{room}}',
      hotspot_editor_help:
        'Cliquez dans l’image 360° pour ajouter un hotspot. Faites glisser pour déplacer. Choisissez le type et la pièce cible ci-dessous, puis enregistrez.',
      hotspot_editor_save: 'Enregistrer les hotspots',
      hotspot_editor_empty: 'Aucun hotspot. Cliquez sur l’image 360° pour en ajouter un.',
      hotspot_type_circle: 'Cercle',
      hotspot_type_arrow: 'Flèche',
      hotspot_direction_forward: 'Avant',
      hotspot_direction_left: 'Gauche',
      hotspot_direction_right: 'Droite',
      hotspot_direction_back: 'Arrière',
      hotspot_arrow_direction_clock: 'Direction (horloge 1–12)',
      hotspot_clock_oclock: 'h',

      editor_hotspots_title: 'Hotspots',
      editor_hotspots_help:
        'Cliquez dans l’image 360° pour ajouter un point. Faites glisser les cercles pour ajuster, puis choisissez le type et la pièce cible ci-dessous.',
      editor_hotspots_empty:
        'Aucun hotspot. Cliquez sur l’image 360° pour créer un hotspot de navigation.',
      editor_save_hotspots: 'Enregistrer les hotspots',
      editor_arrow_forward: 'Flèche avant',
      editor_arrow_left: 'Flèche gauche',
      editor_arrow_right: 'Flèche droite',
      editor_arrow_back: 'Flèche arrière',
    },
  },
  ar: {
    translation: {
      brand_name: 'DCEENY Interior Design Studio',

      language_en: 'English',
      language_fr: 'Français',
      language_ar: 'العربية',

      landing_title: 'DCEENY Interior Design Studio',
      landing_subtitle: 'سجّل الدخول لعرض فواتيرك وجولات المشروع بتقنية 360°.',
      landing_sign_in: 'تسجيل الدخول',
      landing_create_account: 'إنشاء حساب',

      auth_email_label: 'البريد الإلكتروني',
      auth_password_label: 'كلمة المرور',
      auth_full_name_label: 'الاسم الكامل',
      auth_new_client: 'عميل جديد؟',
      auth_create_account_link: 'إنشاء حساب',
      auth_already_have_account: 'هل لديك حساب بالفعل؟',
      auth_sign_in_link: 'تسجيل الدخول',

      login_title: 'DCEENY Interior Design Studio',
      login_subtitle: 'تسجيل الدخول إلى حسابك',
      login_error_invalid_credentials: 'بيانات الدخول غير صحيحة. حاول مرة أخرى.',
      login_submit_default: 'تسجيل الدخول',
      login_submit_loading: 'جاري تسجيل الدخول…',

      forgot_password_link: 'نسيت كلمة المرور؟',
      forgot_password_title: 'إعادة تعيين كلمة المرور',
      forgot_password_description: 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.',
      forgot_password_send_button: 'إرسال الرابط',
      forgot_password_sending: 'جاري الإرسال…',
      forgot_password_back_login: 'العودة لتسجيل الدخول',
      forgot_password_success_title: 'تم إرسال البريد.',
      forgot_password_success_description: 'تحقق من بريدك واتبع التعليمات لإنشاء كلمة مرور جديدة.',
      forgot_password_return_login: 'العودة لتسجيل الدخول',
      forgot_password_error_invalid_email: 'يرجى إدخال بريد إلكتروني صحيح.',
      forgot_password_error_user_not_found: 'لا يوجد حساب بهذا البريد.',
      forgot_password_error_network: 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.',
      forgot_password_error_generic: 'حدث خطأ. يرجى المحاولة مرة أخرى.',

      signup_title: 'DCEENY Interior Design Studio',
      signup_subtitle: 'إنشاء حساب عميل جديد',
      signup_error_generic: 'تعذر إنشاء الحساب. يرجى التحقق من البيانات.',
      signup_error_email_in_use: 'هذا البريد مسجّل مسبقًا. يرجى تسجيل الدخول.',
      signup_submit_default: 'إنشاء حساب',
      signup_submit_loading: 'جاري الإنشاء…',

      header_aria_back: 'رجوع',
      header_aria_home: 'الرئيسية',
      header_aria_settings: 'الإعدادات',
      header_aria_logout: 'تسجيل الخروج',

      admin_nav_dashboard: 'لوحة التحكم',
      admin_nav_projects: 'المشاريع والمشاهد',
      admin_nav_customers: 'العملاء و Factor',

      dashboard_welcome: 'مرحبًا',
      dashboard_welcome_name: 'مرحبًا، {{name}}',
      dashboard_admin_subtitle: 'إدارة الفواتير والتقدّم الأسبوعي 360° لمشاريعك.',
      dashboard_customer_subtitle: 'اطّلع على الـ Factor واستكشف مشروعك بتقنية 360°.',
      dashboard_choose_section: 'اختر قسمًا',
      dashboard_factor_title: 'Factor',
      dashboard_factor_subtitle_admin: 'إدارة الفواتير',
      dashboard_factor_subtitle_customer: 'عرض الفواتير',
      dashboard_360_title: 'DCEENY 360',
      dashboard_360_locked_subtitle: 'عرض 360° غير مفعّل بعد',
      dashboard_360_subtitle_admin: 'إدارة التقدّم الأسبوعي',
      dashboard_360_subtitle_customer: 'عرض التقدّم 360°',

      info_project_progress_title: 'تقدّم المشروع',
      info_project_progress_text: 'تابع التحديثات الأسبوعية بتقنية 360°.',
      info_clear_billing_title: 'فواتير واضحة',
      info_clear_billing_text: 'كل المشتريات والمدفوعات في مكان واحد.',
      info_controlled_access_title: 'وصول مضبوط',
      info_controlled_access_text: 'عروض 360° المميّزة متاحة عند الطلب.',

      admin_dashboard_welcome: 'مرحبًا، {{name}}',
      admin_dashboard_title: 'لوحة التحكم',
      admin_dashboard_subtitle: 'إدارة العملاء و Factor ومشاريع 360°.',
      admin_dashboard_customers_factor_label: 'العملاء و Factor',
      admin_dashboard_customers_factor_helper: 'الفواتير والمدفوعات',
      admin_dashboard_projects_label: 'المشاريع و DCEENY 360',
      admin_dashboard_projects_helper: 'تعيين العميل، الأسابيع والمشاهد',

      factor_total_purchases: 'إجمالي المشتريات',
      factor_total_paid: 'إجمالي المدفوع',
      factor_balance: 'الرصيد',
      factor_purchases: 'المشتريات',
      factor_payments: 'المدفوعات',
      factor_table_date: 'التاريخ',
      factor_table_description: 'الوصف',
      factor_table_amount: 'المبلغ (DA)',
      factor_table_method: 'الطريقة',
      factor_table_note: 'ملاحظة',
      factor_empty_purchases: 'لا توجد مشتريات بعد.',
      factor_empty_payments: 'لا توجد مدفوعات بعد.',

      factor_admin_title: 'Factor',
      factor_admin_subtitle: 'مشتريات ومدفوعات هذا العميل.',
      factor_admin_add_purchase: '+ إضافة شراء',
      factor_admin_add_payment: '+ إضافة دفع',
      factor_admin_modal_edit_purchase: 'تعديل الشراء',
      factor_admin_modal_add_purchase: 'إضافة شراء',
      factor_admin_modal_edit_payment: 'تعديل الدفع',
      factor_admin_modal_add_payment: 'إضافة دفع',
      factor_delete_purchase_confirm: 'حذف هذا الشراء؟',
      factor_delete_payment_confirm: 'حذف هذا الدفع؟',

      customer_factor_title: 'الـ Factor الخاص بك',
      customer_factor_subtitle: ' تواصل معنا لأي تعديل',

      common_save: 'حفظ',
      common_saving: 'جاري الحفظ…',
      common_cancel: 'إلغاء',
      common_delete: 'حذف',
      common_edit: 'تعديل',
      common_actions: 'إجراءات',
      common_description_placeholder: 'الوصف',
      common_project: 'مشروع',
      common_room: 'غرفة',
      common_fullscreen: 'وضع ملء الشاشة',
      common_exit_fullscreen: 'الخروج من ملء الشاشة',
      factor_payment_method_placeholder: 'مثال: تحويل بنكي، نقدًا',
      factor_payment_note_placeholder: 'اختياري',

      customer_360_weeks_title: 'التقدّم الأسبوعي',
      customer_360_weeks_subtitle: 'اختر أسبوعًا لعرض مشاهد 360°.',
      customer_360_weeks_empty: 'لا توجد أسابيع متاحة بعد.',
      customer_360_week_label: 'الأسبوع {{number}}',
      customer_360_rooms_count_one: '{{count}} غرفة',
      customer_360_rooms_count_other: '{{count}} غرف',
      customer_360_open_week: 'فتح الأسبوع',
      customer_360_overview_weeks: 'الأسابيع الموثّقة',
      customer_360_overview_rooms: 'الغرف الموثّقة',
      customer_360_overview_last_update: 'آخر تحديث',
      customer_360_week_latest_badge: 'الأحدث',

      customer_360_viewer_back: 'العودة إلى الأسابيع',
      customer_360_rooms_title: 'الغرف',
      customer_360_rooms_subtitle: 'اضغط على الغرفة لعرضها بتقنية 360°',
      customer_360_no_scenes_title: 'لا توجد مشاهد 360° لهذا الأسبوع بعد',
      customer_360_no_scenes_subtitle: 'ستظهر الغرف الجديدة هنا بعد إضافتها.',

      admin_projects_title: 'المشاريع',
      admin_projects_subtitle: 'تعيين العملاء وتفعيل عرض 360° لكل مشروع.',
      admin_projects_create_title_label: 'اسم المشروع',
      admin_projects_create_address_label: 'العنوان',
      admin_projects_create_button: 'إضافة مشروع',
      admin_projects_table_name: 'الاسم',
      admin_projects_table_address: 'العنوان',
      admin_projects_table_customer: 'العميل',
      admin_projects_table_unlock_360: 'تفعيل 360',
      admin_projects_not_assigned: 'غير معيّن',
      admin_projects_weeks_link: 'الأسابيع',
      admin_projects_delete: 'حذف',
      admin_projects_empty: 'لا توجد مشاريع بعد. أنشئ واحدًا بالأعلى.',
      admin_projects_delete_confirm: 'حذف هذا المشروع وجميع أسابيعه؟',

      admin_customers_title: 'العملاء',
      admin_customers_subtitle: 'افتح فاتورة العميل لإدارة المشتريات والمدفوعات.',
      admin_customers_table_name: 'الاسم',
      admin_customers_table_email: 'البريد الإلكتروني',
      admin_customers_empty: 'لا يوجد عملاء بعد. سيظهرون هنا بعد إنشاء حساب.',
      admin_customers_open_factor_aria: 'فتح الفاتورة',

      admin_project_weeks_back: 'المشاريع',
      admin_project_weeks_title_suffix: 'الأسابيع والمشاهد',
      admin_project_weeks_add_week_title: 'إضافة أسبوع',
      admin_project_weeks_week_number: 'رقم الأسبوع',
      admin_project_weeks_week_title_label: 'العنوان (مثال: الأسبوع 4 – الأرضيات)',
      admin_project_weeks_week_title_placeholder: 'الأسبوع 4 – الأرضيات',
      admin_project_weeks_create_week: 'إنشاء الأسبوع',
      admin_project_weeks_uploading: 'جاري الرفع… {{progress}}%',
      admin_project_weeks_uploading_label: 'جاري الرفع…',
      admin_project_weeks_section_title: 'المشاهد والنقاط',
      admin_project_weeks_section_help:
        'ارفع صور 360° لكل أسبوع، ثم اضغط "تعديل النقاط" لإضافة نقاط التنقل بين الغرف.',
      admin_project_weeks_empty:
        'لا توجد أسابيع بعد. أنشئ أسبوعًا بالأعلى، ثم أضف مشاهد 360° ونقاط التنقل.',
      admin_project_weeks_add_360_photo: 'إضافة صورة 360:',
      admin_project_weeks_room_name_placeholder: 'اسم الغرفة',
      admin_project_weeks_delete_week: 'حذف الأسبوع',
      admin_project_weeks_delete_week_confirm: 'حذف هذا الأسبوع وجميع مشاهده؟',
      admin_project_weeks_no_scenes_in_week: 'لا توجد مشاهد لهذا الأسبوع. ارفع JPG 360° بالأعلى.',
      admin_project_weeks_hotspots_count_one: '{{count}} نقطة',
      admin_project_weeks_hotspots_count_other: '{{count}} نقاط',
      admin_project_weeks_edit_hotspots: 'تعديل النقاط',
      admin_project_weeks_remove: 'إزالة',
      admin_project_weeks_remove_scene_confirm: 'إزالة هذا المشهد من الأسبوع؟',
      admin_project_weeks_set_main: 'تعيين كالمشهد الرئيسي',
      admin_project_weeks_main_label: 'المشهد الرئيسي',

      viewer_unavailable: 'عارض 360° غير متاح في هذه البيئة.',
      viewer_scene_failed_title: 'تعذر تحميل المشهد',
      viewer_failed_to_load_scene_fallback: 'فشل تحميل المشهد',
      readonly_loading_scene: 'جاري تحميل مشهد 360°',

      hotspot_editor_title: 'تعديل النقاط · {{room}}',
      hotspot_editor_help:
        'اضغط داخل صورة 360° لإضافة نقطة. اسحب لتحريكها. اختر النوع والغرفة المستهدفة بالأسفل، ثم احفظ.',
      hotspot_editor_save: 'حفظ النقاط',
      hotspot_editor_empty: 'لا توجد نقاط. اضغط على صورة 360° لإضافة نقطة.',
      hotspot_type_circle: 'دائرة',
      hotspot_type_arrow: 'سهم',
      hotspot_direction_forward: 'أمام',
      hotspot_direction_left: 'يسار',
      hotspot_direction_right: 'يمين',
      hotspot_direction_back: 'خلف',
      hotspot_arrow_direction_clock: 'الاتجاه (الساعة 1–12)',
      hotspot_clock_oclock: 'س',

      editor_hotspots_title: 'النقاط',
      editor_hotspots_help:
        'اضغط داخل صورة 360° لإضافة نقطة. اسحب الدوائر لضبطها، ثم اختر النوع والغرفة المستهدفة بالأسفل.',
      editor_hotspots_empty:
        'لا توجد نقاط بعد. اضغط على صورة 360° لإنشاء نقطة تنقل.',
      editor_save_hotspots: 'حفظ النقاط',
      editor_arrow_forward: 'سهم للأمام',
      editor_arrow_left: 'سهم لليسار',
      editor_arrow_right: 'سهم لليمين',
      editor_arrow_back: 'سهم للخلف',
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'appLanguage',
    },
  })
  .then(() => {
    const lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
    setDocumentDirection(lang);
  });

i18n.on('languageChanged', (lng) => {
  setDocumentDirection(normalizeLanguage(lng));
});

export default i18n;

