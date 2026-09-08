pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'docker.io/doctormeteno'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        TELEGRAM_BOT_TOKEN = credentials('telegram-bot-token')
        TELEGRAM_CHAT_ID = credentials('telegram-chat-id')
    }

    stages {
        stage('Build Producer Service') {
            steps {
                dir('producer-service') {
                    sh 'docker build -t ${DOCKER_REGISTRY}/producer-service:${IMAGE_TAG} .'
                }
            }
        }

        stage('Build Consumer Service') {
            steps {
                dir('consumer-service') {
                    sh 'docker build -t ${DOCKER_REGISTRY}/consumer-service:${IMAGE_TAG} .'
                }
            }
        }

        stage('Build Python Producer Service') {
            steps {
                dir('python-producer-service') {
                    sh 'docker build -t ${DOCKER_REGISTRY}/python-producer-service:${IMAGE_TAG} .'
                }
            }
        }

        stage('Build Go Consumer Service') {
            steps {
                dir('go-consumer-service') {
                    sh 'docker build -t ${DOCKER_REGISTRY}/go-consumer-service:${IMAGE_TAG} .'
                }
            }
        }

        stage('Push Images') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                    sh '''
                        docker push ${DOCKER_REGISTRY}/producer-service:${IMAGE_TAG}
                        docker push ${DOCKER_REGISTRY}/consumer-service:${IMAGE_TAG}
                        docker push ${DOCKER_REGISTRY}/python-producer-service:${IMAGE_TAG}
                        docker push ${DOCKER_REGISTRY}/go-consumer-service:${IMAGE_TAG}
                    '''
                }
            }
        }

        stage('Deploy Staging') {
            when {
                branch 'develop'
            }
            steps {
                sh 'docker compose -f docker-compose.yml up -d --force-recreate'
            }
        }

        stage('Deploy Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?'
                sh 'docker compose -f docker-compose.yml up -d --force-recreate'
            }
        }
    }

    post {
        success {
            script {
                sh '''
                    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
                        -d chat_id="${TELEGRAM_CHAT_ID}" \
                        -d text="✅ CI/CD SUCCESS

Job: ${env.JOB_NAME}
Build: #${env.BUILD_NUMBER}
Branch: ${env.BRANCH_NAME}
Commit: ${env.GIT_COMMIT}
Author: ${env.GIT_AUTHOR}

All services built and pushed successfully!"
                '''
            }
        }
        failure {
            script {
                sh '''
                    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
                        -d chat_id="${TELEGRAM_CHAT_ID}" \
                        -d text="❌ CI/CD FAILED

Job: ${env.JOB_NAME}
Build: #${env.BUILD_NUMBER}
Branch: ${env.BRANCH_NAME}
Author: ${env.GIT_AUTHOR}

Please check Jenkins for details!"
                '''
            }
        }
    }
}
