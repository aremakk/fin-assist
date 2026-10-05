package com.budgetapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BudgetAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(BudgetAppApplication.class, args);
    }
}
