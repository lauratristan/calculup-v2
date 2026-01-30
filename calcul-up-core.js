/**
 * CALCUL UP - MODULE CORE (VERSION MISE À JOUR)
 * Firebase, navigation et état global de l'application
 * 🆕 Intégration signalements et mise à jour immédiate des stats
 */

window.CalculUpCore = (function() {
    'use strict';

    // =============================================================================
    // ÉTAT GLOBAL DE L'APPLICATION
    // =============================================================================
    
    let app = null;
    let auth = null;
    let db = null;
    let user = null;
    let currentScreen = 'login';
    let firebaseReady = false;
    let isLoading = false;

    // Cache pour optimiser les requêtes
    let questionsCache = new Map();
    let usersCache = new Map();

    // =============================================================================
    // INITIALISATION FIREBASE
    // =============================================================================
    
    async function initializeFirebase() {
        console.log('🔥 Initialisation Firebase...');
        
        if (!window.firebase) {
            throw new Error('Firebase CDN non disponible');
        }
        
        try {
            // Initialiser Firebase
            const config = CalculUpData.getFirebaseConfig();
            app = window.firebase.initializeApp(config);
            auth = window.firebase.auth();
            db = window.firebase.firestore();
            
            // Configuration Firestore
            db.settings({ 
                cacheSizeBytes: window.firebase.firestore.CACHE_SIZE_UNLIMITED 
            });
            
            // Activer la persistance hors ligne
            await db.enablePersistence().catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('⚠️ Persistance déjà activée dans un autre onglet');
                } else if (err.code === 'unimplemented') {
                    console.warn('⚠️ Persistance non supportée par ce navigateur');
                }
            });
            
            firebaseReady = true;
            console.log('✅ Firebase initialisé avec succès');
            
            // Initialiser les questions par défaut
            await initializeDefaultQuestions();
            
            // Écouter les changements d'authentification
            auth.onAuthStateChanged(handleAuthStateChange);
            
        } catch (error) {
            console.error('❌ Erreur Firebase:', error);
            throw error;
        }
    }

    async function initializeDefaultQuestions() {
        try {
            console.log('📚 Vérification questions par défaut...');
            
            // Vérifier si questions système existent
            const questionsSnapshot = await db.collection('questions')
                .where('creator', '==', 'system')
                .limit(1)
                .get();
            
            if (questionsSnapshot.empty) {
                console.log('📚 Ajout des questions par défaut...');
                
                const batch = db.batch();
                const defaultQuestions = CalculUpData.getDefaultQuestions();
                
                defaultQuestions.forEach(question => {
                    const docRef = db.collection('questions').doc(question.id);
                    batch.set(docRef, {
                        ...question,
                        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                
                await batch.commit();
                console.log('✅ Questions par défaut ajoutées');
            } else {
                console.log('✅ Questions par défaut déjà présentes');
            }
            
        } catch (error) {
            console.error('❌ Erreur initialisation questions:', error);
            console.log('📚 Mode hors ligne - utilisation questions locales');
        }
    }

    // =============================================================================
    // GESTION DE L'AUTHENTIFICATION
    // =============================================================================
    
    async function handleAuthStateChange(firebaseUser) {
        console.log('🔐 Changement authentification:', firebaseUser ? 'connecté' : 'déconnecté');
        
        if (firebaseUser) {
            await loadUserProfile(firebaseUser);
        } else {
            user = null;
            usersCache.clear();
            navigateToScreen('login');
        }
    }
    
    async function loadUserProfile(firebaseUser) {
        try {
            showLoading('Chargement du profil...');
            
            const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
            
            if (userDoc.exists) {
                user = { id: firebaseUser.uid, uid: firebaseUser.uid, ...userDoc.data() };
                usersCache.set(firebaseUser.uid, user);

// 🆕 AJOUTER après "user = { id: firebaseUser.uid, uid: firebaseUser.uid, ...userDoc.data() };" :

// Vérification et correction automatique du niveau
const currentXP = user.xp || 0;
const expectedLevel = Math.floor(currentXP / 500) + 1;

if (user.level !== expectedLevel) {
    console.log('🔄 Correction niveau automatique:', user.level, '->', expectedLevel, 'pour', currentXP, 'XP');
    
    // Corriger immédiatement en local
    user.level = expectedLevel;
    
    // Corriger en base de données
    db.collection('users').doc(firebaseUser.uid).update({
        level: expectedLevel,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        console.log('✅ Niveau corrigé en base de données');
    }).catch(error => {
        console.warn('⚠️ Erreur correction niveau:', error);
    });
}
                
                console.log('✅ Profil chargé:', user.identifier);
                
                // Navigation selon le type d'utilisateur
                if (user.type === 'admin') {
                    navigateToScreen('admin-dashboard');
                } else if (user.type === 'teacher') {
                    navigateToScreen('teacher-dashboard');
                } else {
                    navigateToScreen('home');
                }
            } else {
                console.warn('⚠️ Profil utilisateur non trouvé');
                await auth.signOut();
            }
        } catch (error) {
            console.error('❌ Erreur chargement profil:', error);
            showError('Erreur de chargement du profil');
            navigateToScreen('login');
        } finally {
            hideLoading();
        }
    }

    // =============================================================================
    // SYSTÈME DE NAVIGATION
    // =============================================================================
    
    function navigateToScreen(screenName, params = {}) {
    console.log('📱 Navigation vers:', screenName, params);
    
    currentScreen = screenName;
    
    try {
        switch (screenName) {
            case 'login':
                CalculUpAuth.showLoginScreen();
                break;
                
            // Dans calcul-up-core.js, REMPLACER le case 'home' dans navigateToScreen par :

// Dans calcul-up-core.js, REMPLACER le case 'home' dans navigateToScreen par :

case 'home':
    // 🔧 CORRECTION : Utiliser la variable locale 'user' au lieu de getUser()
    if (user) {
        if (user.type === 'teacher') {
            CalculUpUser.showTeacherDashboard();
        } else if (user.type === 'admin') {
            CalculUpAdmin.showAdminDashboard();
        } else {
            CalculUpUser.showHomeScreen();
        }
    } else {
        CalculUpAuth.showLoginScreen();
    }
    break;
                
            case 'profile':
                CalculUpUser.showProfileScreen();
                break;
                
            case 'stats':
                CalculUpUser.showStatsScreen();
                break;
                
            case 'game-setup':
                CalculUpGame.showConfigScreen();
                break;
                
            case 'game':
                CalculUpGame.showGameScreen();
                break;
                
            case 'results':
                CalculUpGame.showResultsScreen();
                break;
                
            case 'create-question':
                CalculUpQuestions.showCreateQuestionScreen();
                break;
                
            // 🔧 VÉRIFIER QUE CE CASE EXISTE ET POINTE VERS LA BONNE FONCTION
            case 'teacher-dashboard':
                CalculUpUser.showTeacherDashboard();
                break;
                
            case 'question-catalog':
                CalculUpUser.showQuestionCatalog();
                break;
                
            case 'admin-dashboard':
                CalculUpAdmin.showAdminDashboard();
                break;
                
            case 'reports-management':
                if (window.CalculUpReports) {
                    CalculUpReports.showReportsManagement();
                } else {
                    showError('Module signalements non disponible');
                }
                break;
                
            default:
                console.warn('⚠️ Écran inconnu:', screenName);
                navigateToScreen('login');
        }
    } catch (error) {
        console.error('❌ Erreur navigation:', error);
        showError('Erreur de navigation: ' + error.message);
    }
}

    // =============================================================================
    // GESTION DES ERREURS ET LOADING
    // =============================================================================
    
    function showError(message, duration = 5000) {
        console.error('🚨 Erreur:', message);
        
        // Chercher un conteneur d'erreur existant
        let errorContainer = document.getElementById('error-container');
        
        if (!errorContainer) {
            // Créer un conteneur d'erreur
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-container';
            errorContainer.className = 'fixed top-4 right-4 z-50';
            document.body.appendChild(errorContainer);
        }
        
        // Créer l'alerte d'erreur
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert error slide-in';
        errorAlert.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-xl leading-none">×</button>
            </div>
        `;
        
        errorContainer.appendChild(errorAlert);
        
        // Auto-suppression
        if (duration > 0) {
            setTimeout(() => {
                if (errorAlert.parentElement) {
                    errorAlert.remove();
                }
            }, duration);
        }
    }
    
    function showSuccess(message, duration = 3000) {
        console.log('✅ Succès:', message);
        
        let successContainer = document.getElementById('success-container');
        
        if (!successContainer) {
            successContainer = document.createElement('div');
            successContainer.id = 'success-container';
            successContainer.className = 'fixed top-4 right-4 z-50';
            document.body.appendChild(successContainer);
        }
        
        const successAlert = document.createElement('div');
        successAlert.className = 'alert success slide-in';
        successAlert.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-xl leading-none">×</button>
            </div>
        `;
        
        successContainer.appendChild(successAlert);
        
        if (duration > 0) {
            setTimeout(() => {
                if (successAlert.parentElement) {
                    successAlert.remove();
                }
            }, duration);
        }
    }

    function showInfo(message, duration = 3000) {
        console.log('ℹ️ Info:', message);
        
        let infoContainer = document.getElementById('info-container');
        
        if (!infoContainer) {
            infoContainer = document.createElement('div');
            infoContainer.id = 'info-container';
            infoContainer.className = 'fixed top-4 right-4 z-50';
            document.body.appendChild(infoContainer);
        }
        
        const infoAlert = document.createElement('div');
        infoAlert.className = 'alert info slide-in';
        infoAlert.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-xl leading-none">×</button>
            </div>
        `;
        
        infoContainer.appendChild(infoAlert);
        
        if (duration > 0) {
            setTimeout(() => {
                if (infoAlert.parentElement) {
                    infoAlert.remove();
                }
            }, duration);
        }
    }
    
    function showLoading(message = 'Chargement...') {
        isLoading = true;
        
        let loadingOverlay = document.getElementById('loading-overlay');
        
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
            document.body.appendChild(loadingOverlay);
        }
        
        loadingOverlay.innerHTML = `
            <div class="bg-white rounded-xl p-6 text-center">
                <div class="loading-spin mb-4"></div>
                <p class="text-stone-600">${message}</p>
            </div>
        `;
        
        loadingOverlay.style.display = 'flex';
    }
    
    function hideLoading() {
        isLoading = false;
        
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    // =============================================================================
    // UTILITAIRES DE DONNÉES (🆕 MISE À JOUR IMMÉDIATE)
    // =============================================================================
    
    async function fetchQuestions(filters = {}) {
        try {
            const cacheKey = JSON.stringify(filters);
            
            if (questionsCache.has(cacheKey)) {
                console.log('📋 Questions récupérées du cache');
                return questionsCache.get(cacheKey);
            }
            
            let query = db.collection('questions').where('verified', '==', true);
            
            if (filters.level) {
                query = query.where('level', '==', filters.level);
            }
            if (filters.chapter) {
                query = query.where('chapter', '==', filters.chapter);
            }
            if (filters.difficulty) {
                query = query.where('difficulty', '==', filters.difficulty);
            }
            if (filters.notion && filters.notions?.length <= 10) {
                query = query.where('notion', 'in', filters.notions);
            }
            
            const snapshot = await query.get();
            const questions = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            
            // Ajouter les questions par défaut si nécessaire
            if (questions.length < 5) {
                const defaultQuestions = CalculUpData.getDefaultQuestions(filters);
                questions.push(...defaultQuestions);
            }
            
            questionsCache.set(cacheKey, questions);
            console.log('📋 Questions chargées:', questions.length);
            
            return questions;
            
        } catch (error) {
            console.error('❌ Erreur récupération questions:', error);
            return CalculUpData.getDefaultQuestions(filters);
        }
    }
    
    // 🆕 FONCTION MISE À JOUR : Mise à jour immédiate des données utilisateur
    async function updateUserData(updates) {
        if (!user || !firebaseReady) return false;
        
        try {
            console.log('💾 Mise à jour utilisateur:', updates);
            
            await db.collection('users').doc(user.uid).update({
                ...updates,
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // 🆕 MISE À JOUR IMMÉDIATE de l'objet utilisateur local
            Object.assign(user, updates);
            usersCache.set(user.uid, user);
            
            // 🆕 Vérifier montée de niveau si XP mis à jour
            if (updates.xp !== undefined) {
                await checkLevelUp(user.uid, updates.xp);
            }
            
            console.log('✅ Données utilisateur mises à jour:', user.identifier);
            return true;
            
        } catch (error) {
            console.error('❌ Erreur mise à jour utilisateur:', error);
            return false;
        }
    }

    // 🆕 NOUVELLE FONCTION : Vérification et gestion montée de niveau
    async function checkLevelUp(userId, newXp) {
        try {
            const newLevel = Math.floor(newXp / 500) + 1;
            const currentLevel = user.level || 1;
            
            if (newLevel > currentLevel) {
                console.log('🎉 Montée de niveau:', currentLevel, '->', newLevel);
                
                // Mettre à jour le niveau
                user.level = newLevel;
                await db.collection('users').doc(userId).update({
                    level: newLevel
                });
                
                // Afficher notification
                showSuccess(`🎉 Niveau ${newLevel} atteint ! Nouvelles fonctionnalités débloquées !`);
                
                // Vérifier nouvelles fonctionnalités débloquées
                const featureLevels = CalculUpData.getFeatureLevels();
                const newFeatures = Object.entries(featureLevels)
                    .filter(([feature, level]) => level === newLevel)
                    .map(([feature, level]) => feature);
                
                if (newFeatures.length > 0) {
                    setTimeout(() => {
                        showInfo(`🔓 Nouvelles fonctionnalités : ${newFeatures.join(', ')}`);
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('❌ Erreur vérification niveau:', error);
        }
    }

    // =============================================================================
    // FONCTIONS UTILITAIRES
    // =============================================================================
    
    function formatError(error) {
        const messages = CalculUpData.getMessages().errors;
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                return 'Cet email est déjà utilisé';
            case 'auth/weak-password':
                return 'Mot de passe trop faible (minimum 6 caractères)';
            case 'auth/invalid-email':
                return 'Adresse email invalide';
            case 'auth/user-not-found':
                return 'Aucun compte trouvé avec cet email';
            case 'auth/wrong-password':
                return 'Mot de passe incorrect';
            case 'auth/network-request-failed':
                return messages.networkError;
            default:
                return error.message || 'Erreur inconnue';
        }
    }
    
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // =============================================================================
    // GESTION DES EVENTS GLOBAUX
    // =============================================================================
    
    function setupGlobalEvents() {
        // Gestion des erreurs non capturées
        window.addEventListener('error', (event) => {
            console.error('🚨 Erreur globale:', event.error);
            showError('Une erreur inattendue s\'est produite');
        });
        
        // Gestion des promesses rejetées
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 Promesse rejetée:', event.reason);
            showError('Erreur de connexion');
            event.preventDefault();
        });
        
        // Gestion de la perte de connexion
        window.addEventListener('online', () => {
            showSuccess('Connexion rétablie');
        });
        
        window.addEventListener('offline', () => {
            showError('Connexion perdue - Mode hors ligne activé', 0);
        });
    }

    // =============================================================================
    // INITIALISATION PRINCIPALE
    // =============================================================================
    
    async function initialize() {
        try {
            console.log('🚀 Initialisation Calcul Up...');
            
            showLoading('Initialisation...');
            setupGlobalEvents();
            
            // Attendre que Firebase soit disponible
            let attempts = 0;
            while (!window.firebase && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.firebase) {
                throw new Error('Firebase CDN non disponible après 5 secondes');
            }
            
            await initializeFirebase();
            
            console.log('✅ Calcul Up initialisé avec succès');
            
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            hideLoading();
            
            document.getElementById('root').innerHTML = `
                <div class="min-h-screen flex items-center justify-center bg-rose-50">
                    <div class="text-center p-8 max-w-md">
                        <div class="text-6xl mb-4">❌</div>
                        <h1 class="text-2xl font-bold text-rose-700 mb-4">Erreur d'initialisation</h1>
                        <p class="text-rose-600 mb-4">${error.message}</p>
                        <button onclick="window.location.reload()" 
                                class="btn-primary">
                            Recharger la page
                        </button>
                    </div>
                </div>
            `;
        } finally {
            hideLoading();
        }
    }

    // =============================================================================
    // API PUBLIQUE DU MODULE
    // =============================================================================
    
    return {
        // Initialisation
        initialize,
        
        // Navigation
        navigateToScreen,
        getCurrentScreen: () => currentScreen,
        
        // État
        getUser: () => user,
        isLoggedIn: () => !!user,
        isFirebaseReady: () => firebaseReady,
        isLoading: () => isLoading,
        
        // Firebase
        getAuth: () => auth,
        getDb: () => db,
        
        // Données
        fetchQuestions,
        updateUserData,
        checkLevelUp, // 🆕 NOUVEAU
        
        // Interface
        showError,
        showSuccess,
        showInfo,
        showLoading,
        hideLoading,
        
        // Utilitaires
        formatError,
        generateId,
        debounce
    };
})();

console.log('✅ Module CalculUpCore chargé avec mise à jour immédiate et signalements');