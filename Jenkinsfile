pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code....'
                checkout scm
            }
        }

        stage('Install and Verify') {
            steps {
                echo 'Running install and verification inside Node 22...'
                sh 'docker run --rm -v ${WORKSPACE}:/app -w /app node:22 sh -c "npm ci && node --version && npm --version"'
            }
        }

        stage('Test') {
            steps {
                echo 'Installing jest dynamically and running tests...'
                // This forces the container to install jest locally into /app before running the npm test command
                sh 'docker run --rm -v ${WORKSPACE}:/app -w /app node:22 sh -c "npm install jest --save-dev && npm test"'
            }
        }
    }
    
    post {
        success {
            echo 'CI pipeline completed successfully!'
        }
        failure {
            echo 'CI pipeline failed!'
        }
        always {
            echo 'Pipeline finished.'
        }
    }
}
